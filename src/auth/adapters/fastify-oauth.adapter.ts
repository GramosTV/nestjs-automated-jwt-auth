import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class FastifyOAuthAdapter extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
      state: true,
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { name, emails, photos } = profile;

      if (!emails || emails.length === 0) {
        done(new Error('Google profile is missing email information'), false);
        return;
      }

      const user = {
        email: emails[0].value,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        picture: photos && photos.length > 0 ? photos[0].value : '',
        accessToken,
        refreshToken,
      };

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
