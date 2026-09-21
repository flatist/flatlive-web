export function normalizeUsername(value: string) {
  return value.trim();
}

export function validateUsername(username: string) {
  const value = normalizeUsername(username);

  if (!value) {
    return "아이디를 입력해주세요.";
  }

  if (value.length < 3 || value.length > 20) {
    return "아이디는 3~20자 사이여야 합니다.";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return "아이디는 영문, 숫자, 언더스코어만 사용할 수 있습니다.";
  }

  return "";
}

export function validateEmail(email: string) {
  const value = email.trim();

  if (!value) {
    return "이메일을 입력해주세요.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "올바른 이메일 형식이 아닙니다.";
  }

  return "";
}

export function validatePasswordPolicy(password: string) {
  if (!password) {
    return "비밀번호를 입력해주세요.";
  }

  if (password.length < 8) {
    return "비밀번호는 최소 8자 이상이어야 합니다.";
  }

  if (!/[A-Za-z]/.test(password)) {
    return "비밀번호에는 영문이 최소 1자 이상 포함되어야 합니다.";
  }

  if (!/\d/.test(password)) {
    return "비밀번호에는 숫자가 최소 1자 이상 포함되어야 합니다.";
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "비밀번호에는 특수문자가 최소 1자 이상 포함되어야 합니다.";
  }

  return "";
}

export function validateDisplayName(value: string) {
  const displayName = value.trim();

  if (!displayName) {
    return "닉네임을 입력해주세요.";
  }

  if (displayName.length < 2 || displayName.length > 20) {
    return "닉네임은 2~20자 사이여야 합니다.";
  }

  return "";
}
