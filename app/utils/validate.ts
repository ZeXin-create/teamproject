// 邮箱验证
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 手机号验证（中国大陆）
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 密码强度验证
export function checkPasswordStrength(password: string): {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  message: string;
} {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  let level: 'weak' | 'medium' | 'strong' = 'weak';
  let message = '';

  if (score <= 2) {
    level = 'weak';
    message = '密码强度较弱，建议包含大小写字母、数字和特殊字符';
  } else if (score <= 4) {
    level = 'medium';
    message = '密码强度中等，可以增加长度或添加特殊字符';
  } else {
    level = 'strong';
    message = '密码强度很强';
  }

  return { score, level, message };
}

// URL 验证
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 身份证号验证（中国大陆）
export function isValidIdCard(idCard: string): boolean {
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  return idCardRegex.test(idCard);
}

// 非空验证
export function isNotEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

// 数字范围验证
export function isInRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

// 字符串长度验证
export function isValidLength(str: string, min: number, max: number): boolean {
  const length = str.length;
  return length >= min && length <= max;
}

// 表单验证器
interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
  validator?: (value: unknown) => boolean | string;
}

export function validateForm(
  data: Record<string, unknown>,
  rules: ValidationRule[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const value = data[rule.field];
    
    // 必填验证
    if (rule.required && !isNotEmpty(value)) {
      errors[rule.field] = rule.message || `${rule.field} 不能为空`;
      continue;
    }

    // 如果有值，进行其他验证
    if (isNotEmpty(value) && typeof value === 'string') {
      // 最小长度
      if (rule.minLength && value.length < rule.minLength) {
        errors[rule.field] = rule.message || `${rule.field} 至少需要 ${rule.minLength} 个字符`;
        continue;
      }

      // 最大长度
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[rule.field] = rule.message || `${rule.field} 最多 ${rule.maxLength} 个字符`;
        continue;
      }

      // 正则匹配
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[rule.field] = rule.message || `${rule.field} 格式不正确`;
        continue;
      }
    }

    // 自定义验证器
    if (rule.validator && isNotEmpty(value)) {
      const result = rule.validator(value);
      if (result !== true) {
        errors[rule.field] = typeof result === 'string' ? result : (rule.message || `${rule.field} 验证失败`);
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
