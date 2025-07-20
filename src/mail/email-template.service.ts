import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface EmailTemplateContext {
  [key: string]: any;
}

@Injectable()
export class EmailTemplateService {
  private templatesPath = join(process.cwd(), 'src', 'templates', 'email');

  renderTemplate(templateName: string, context: EmailTemplateContext): string {
    try {
      const templatePath = join(this.templatesPath, `${templateName}.hbs`);
      const templateContent = readFileSync(templatePath, 'utf-8');
      
      // Simple template replacement - replace {{variable}} with context values
      let renderedContent = templateContent;
      
      Object.keys(context).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        renderedContent = renderedContent.replace(regex, context[key]);
      });
      
      return renderedContent;
    } catch (error) {
      throw new Error(`Failed to render template ${templateName}: ${error.message}`);
    }
  }

  renderPlainTextFromTemplate(templateName: string, context: EmailTemplateContext): string {
    const html = this.renderTemplate(templateName, context);
    
    // Simple HTML to text conversion
    let text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Clean up multiple newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text;
  }
}
