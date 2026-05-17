/**
 * Validações para o formulário de criação/edição de paciente.
 * Retorna um objeto com os erros por campo (string vazia = sem erro).
 */

export interface PatientFormFields {
  name: string
  birthDate: string
  gender: string
  cpf: string
  rg: string
  phone: string
  observations: string
}

export interface PatientFormErrors {
  name: string
  birthDate: string
  cpf: string
  rg: string
  phone: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Remove tudo que não for dígito */
const digitsOnly = (v: string) => v.replace(/\D/g, '')

// ── máscaras ──────────────────────────────────────────────────────────────────

/** Aplica máscara de CPF: 000.000.000-00 */
export function maskCpf(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Aplica máscara de RG: 00.000.000-0 (aceita X no dígito verificador) */
export function maskRg(value: string): string {
  // preserva X/x no último caractere
  const clean = value.replace(/[^\dxX]/g, '').slice(0, 9)
  const d = clean.slice(0, 8).replace(/\D/g, '') // apenas dígitos na parte numérica
  const last = clean.slice(8) // pode ser dígito ou X
  const full = d + last
  if (full.length <= 2) return full
  if (full.length <= 5) return `${full.slice(0, 2)}.${full.slice(2)}`
  if (full.length <= 8) return `${full.slice(0, 2)}.${full.slice(2, 5)}.${full.slice(5)}`
  return `${full.slice(0, 2)}.${full.slice(2, 5)}.${full.slice(5, 8)}-${full.slice(8)}`
}

/** Aplica máscara de telefone: (00) 0000-0000 ou (00) 00000-0000 */
export function maskPhone(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Valida CPF usando dígitos verificadores.
 * Aceita com ou sem formatação (000.000.000-00 ou 00000000000).
 */
function isValidCpf(cpf: string): boolean {
  const d = digitsOnly(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // todos iguais

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== Number(d[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === Number(d[10])
}

/** Valida telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */
function isValidPhone(phone: string): boolean {
  const d = digitsOnly(phone)
  return d.length === 10 || d.length === 11
}

/** Valida RG: 7 a 9 dígitos (aceita letras X no dígito verificador) */
function isValidRg(rg: string): boolean {
  const d = rg.replace(/[\s.-]/g, '')
  return /^[0-9]{6,8}[0-9xX]$/.test(d)
}

// ── validação principal ───────────────────────────────────────────────────────

export function validatePatientForm(fields: PatientFormFields): PatientFormErrors {
  const errors: PatientFormErrors = { name: '', birthDate: '', cpf: '', rg: '', phone: '' }

  // Nome
  const name = fields.name.trim()
  if (!name) {
    errors.name = 'Nome é obrigatório.'
  } else if (name.length < 3) {
    errors.name = 'Nome deve ter ao menos 3 caracteres.'
  } else if (/\d/.test(name)) {
    errors.name = 'Nome não pode conter números.'
  } else if (name.split(/\s+/).length < 2) {
    errors.name = 'Informe nome e sobrenome.'
  }

  // Data de nascimento
  if (!fields.birthDate) {
    errors.birthDate = 'Data de nascimento é obrigatória.'
  } else {
    const birth = new Date(fields.birthDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (isNaN(birth.getTime())) {
      errors.birthDate = 'Data inválida.'
    } else if (birth > today) {
      errors.birthDate = 'Data de nascimento não pode ser no futuro.'
    } else {
      const age = today.getFullYear() - birth.getFullYear() -
        (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
      if (age > 130) {
        errors.birthDate = 'Data de nascimento inválida (idade acima de 130 anos).'
      }
    }
  }

  // CPF (opcional, mas se preenchido deve ser válido)
  if (fields.cpf.trim()) {
    if (!isValidCpf(fields.cpf)) {
      errors.cpf = 'CPF inválido. Verifique os dígitos.'
    }
  }

  // RG (opcional, mas se preenchido deve ter formato válido)
  if (fields.rg.trim()) {
    if (!isValidRg(fields.rg)) {
      errors.rg = 'RG inválido. Use o formato 00.000.000-0.'
    }
  }

  // Telefone (opcional, mas se preenchido deve ter formato válido)
  if (fields.phone.trim()) {
    if (!isValidPhone(fields.phone)) {
      errors.phone = 'Telefone inválido. Use (XX) XXXXX-XXXX.'
    }
  }

  return errors
}

export function hasFormErrors(errors: PatientFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}
