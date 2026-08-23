import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver, FieldValues } from 'react-hook-form'

/**
 * Zod v4 + React Hook Form resolver helper.
 *
 * Zod v4 distinguishes input types from output types (e.g. z.coerce.number()
 * accepts unknown input but outputs number), which conflicts with RHF's
 * single-type generics. This helper smooths over the mismatch: pass the zod
 * schema, get a resolver typed to the schema's OUTPUT shape (the values your
 * onSubmit receives).
 */
export function zResolver<T extends FieldValues>(schema: unknown): Resolver<T> {
  return zodResolver(schema as never) as unknown as Resolver<T>
}
