// Minimal supabase mock for unit tests. Exports functions used by SessionBoard and resource assignment.

type FromReturn = {
  select: (...args: any[]) => any
  eq: (...args: any[]) => any
  order: (...args: any[]) => any
  limit: (...args: any[]) => any
  maybeSingle: () => Promise<any>
  insert: (payload: any) => Promise<any>
  update: (payload: any) => Promise<any>
  delete: () => Promise<any>
  upsert: (payload: any, opts?: any) => Promise<any>
}

const createFrom = (tableName: string) => {
  const ctx: any = { tableName }
  const chain: any = new Proxy({}, {
    get(_, prop) {
      if (prop === 'maybeSingle') return async () => ({ data: null })
      if (prop === 'select') return (...args: any[]) => chain
      if (prop === 'eq') return (...args: any[]) => chain
      if (prop === 'order') return (...args: any[]) => chain
      if (prop === 'limit') return (...args: any[]) => chain
      if (prop === 'insert') return async (payload: any) => ({ data: payload, error: null })
      if (prop === 'update') return async (payload: any) => ({ data: payload, error: null })
      if (prop === 'delete') return async () => ({ data: null, error: null })
      if (prop === 'upsert') return async (payload: any) => ({ data: payload, error: null })
      return () => chain
    }
  })
  return chain as FromReturn
}

export const supabase = {
  from: (table: string) => createFrom(table),
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any, opts?: any) => ({ error: null }),
      getPublicUrl: (key: string) => ({ data: { publicUrl: `https://storage/${key}` } })
    })
  }
}

export default supabase
