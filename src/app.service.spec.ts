import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return a greeting with the provided username', () => {
      const result = service.getHello('john.doe@example.com');
      expect(result).toEqual('Hello john.doe@example.com');
    });

    it('should handle other user values', () => {
      const result = service.getHello('admin');
      expect(result).toEqual('Hello admin');
    });
  });
});
