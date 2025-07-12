import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(4, 'Password must be at least 4 characters')
}).passthrough();

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const skillSchema = z.object({
  name: z.string().min(2, 'Skill name must be at least 2 characters'),
  type: z.enum(['offered', 'wanted']),
  description: z.string().optional(),
  proficiency_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate')
});

export const swapRequestSchema = z.object({
  providerId: z.number().int().positive(),
  offeredSkillId: z.number().int().positive(),
  wantedSkillId: z.number().int().positive(),
  message: z.string().optional()
});

export const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional()
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('=== Request Details ===');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', req.headers);
    console.log('Raw body:', req.body);
    console.log('Parsed body:', JSON.parse(JSON.stringify(req.body)));
    
    try {
      // Ensure we're working with a plain object
      const body = typeof req.body === 'object' && !Array.isArray(req.body) 
        ? req.body 
        : {};
      
      const parsed = schema.parse(body);
      console.log('Parsed successfully:', parsed);
      req.body = parsed;
      next();
    } catch (error) {
      console.error('Validation error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body,
        validationError: error instanceof z.ZodError ? error.errors : 'Not a Zod error'
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          receivedData: req.body
        });
      }
      next(error);
    }
  };
}