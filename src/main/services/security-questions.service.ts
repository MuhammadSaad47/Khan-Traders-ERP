import { db } from '../db/connection'
import { writeAuditLog } from './base.service'
import bcrypt from 'bcryptjs'

interface SecurityQuestionData {
  question1: string
  answer1: string
  question2: string
  answer2: string
  question3: string
  answer3: string
}

interface SecurityQuestionDisplay {
  question1: string
  question2: string
  question3: string
}

/**
 * Set or update security questions for a user
 */
export async function setSecurityQuestions(
  userId: number,
  questions: SecurityQuestionData
): Promise<void> {
  // Validate all questions and answers are provided
  if (
    !questions.question1 ||
    !questions.answer1 ||
    !questions.question2 ||
    !questions.answer2 ||
    !questions.question3 ||
    !questions.answer3
  ) {
    throw new Error('All three security questions and answers must be provided')
  }

  // Normalize and hash answers (lowercase, trimmed)
  const answer1Hash = await bcrypt.hash(questions.answer1.toLowerCase().trim(), 12)
  const answer2Hash = await bcrypt.hash(questions.answer2.toLowerCase().trim(), 12)
  const answer3Hash = await bcrypt.hash(questions.answer3.toLowerCase().trim(), 12)

  // Update user record
  await db
    .updateTable('users')
    .set({
      security_question_1: questions.question1,
      security_answer_1_hash: answer1Hash,
      security_question_2: questions.question2,
      security_answer_2_hash: answer2Hash,
      security_question_3: questions.question3,
      security_answer_3_hash: answer3Hash,
      updated_at: new Date().toISOString()
    } as any)
    .where('id', '=', userId)
    .execute()

  // Audit log
  await writeAuditLog(
    userId,
    'security_questions_set',
    'users',
    userId,
    null,
    { message: 'Security questions configured' }
  )
}

/**
 * Get security questions for a user (without answers)
 */
export async function getSecurityQuestions(username: string): Promise<SecurityQuestionDisplay> {
  const user: any = await db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', username)
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  if (!user) {
    throw new Error('User not found')
  }

  // Check if recovery is locked
  if (user.recovery_locked_until) {
    const lockedUntil = new Date(user.recovery_locked_until as string)
    if (lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
      throw new Error(
        `Account recovery is temporarily locked. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
      )
    }
  }

  // Check if security questions are set
  if (
    !user.security_question_1 ||
    !user.security_question_2 ||
    !user.security_question_3
  ) {
    throw new Error(
      'Security questions have not been configured for this account. Please contact an administrator.'
    )
  }

  return {
    question1: user.security_question_1 as string,
    question2: user.security_question_2 as string,
    question3: user.security_question_3 as string
  }
}

/**
 * Check if user has security questions configured
 */
export async function hasSecurityQuestions(userId: number): Promise<boolean> {
  const user: any = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  return !!(
    user &&
    user.security_question_1 &&
    user.security_question_2 &&
    user.security_question_3
  )
}

/**
 * Verify security question answers and reset password
 */
export async function verifyAndResetPassword(
  username: string,
  answers: { answer1: string; answer2: string; answer3: string },
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  // Get user with security questions and answer hashes
  const user: any = await db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', username)
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  if (!user) {
    // Don't reveal if username exists or not
    await writeAuditLog(
      null,
      'password_recovery_failed',
      'users',
      0,
      { username },
      { error: 'User not found' }
    )
    throw new Error('Invalid username or security answers')
  }

  // Check if recovery is locked
  if (user.recovery_locked_until) {
    const lockedUntil = new Date(user.recovery_locked_until as string)
    if (lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
      throw new Error(
        `Too many failed attempts. Account recovery is locked for ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
      )
    }
  }

  // Check if security questions are configured
  if (
    !user.security_answer_1_hash ||
    !user.security_answer_2_hash ||
    !user.security_answer_3_hash
  ) {
    throw new Error(
      'Security questions have not been configured for this account. Please contact an administrator.'
    )
  }

  // Verify all three answers
  const answer1Match = await bcrypt.compare(
    answers.answer1.toLowerCase().trim(),
    user.security_answer_1_hash as string
  )
  const answer2Match = await bcrypt.compare(
    answers.answer2.toLowerCase().trim(),
    user.security_answer_2_hash as string
  )
  const answer3Match = await bcrypt.compare(
    answers.answer3.toLowerCase().trim(),
    user.security_answer_3_hash as string
  )

  if (!answer1Match || !answer2Match || !answer3Match) {
    // Increment recovery attempts
    const newAttempts = ((user.recovery_attempts as number) || 0) + 1
    const updates: any = {
      recovery_attempts: newAttempts,
      last_recovery_attempt: new Date().toISOString()
    }

    // Lock account after 5 failed attempts (30-minute lockout)
    if (newAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      updates.recovery_locked_until = lockUntil.toISOString()
    }

    await db
      .updateTable('users')
      .set(updates)
      .where('id', '=', user.id)
      .execute()

    // Audit log
    await writeAuditLog(
      user.id,
      'password_recovery_failed',
      'users',
      user.id,
      null,
      { attempt: newAttempts, total_allowed: 5 }
    )

    if (newAttempts >= 5) {
      throw new Error(
        'Too many failed attempts. Account recovery has been locked for 30 minutes.'
      )
    }

    throw new Error(
      `Invalid security answers. ${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} remaining.`
    )
  }

  // All answers correct - reset password
  const passwordHash = await bcrypt.hash(newPassword, 12)

  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      recovery_attempts: 0,
      last_recovery_attempt: null,
      recovery_locked_until: null,
      updated_at: new Date().toISOString()
    } as any)
    .where('id', '=', user.id)
    .execute()

  // Audit log
  await writeAuditLog(
    user.id,
    'password_recovery_success',
    'users',
    user.id,
    null,
    { message: 'Password reset via security questions' }
  )

  return {
    success: true,
    message: 'Password has been reset successfully. You can now login with your new password.'
  }
}

/**
 * Get predefined security questions list
 */
export function getPredefinedQuestions(): string[] {
  return [
    "What is your mother's maiden name?",
    'What was the name of your first pet?',
    'In which city were you born?',
    'What is your favorite book or movie?',
    'What was the name of your elementary school?',
    "What is your father's middle name?",
    'What was your childhood nickname?',
    'What is the name of the street you grew up on?',
    'What is your favorite food?',
    "What was your first car's make and model?",
    'What is the name of your best childhood friend?',
    'In which city did you meet your spouse/partner?'
  ]
}
