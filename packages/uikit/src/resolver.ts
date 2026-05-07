export interface ComponentResolver {
  type: string
  resolve: (name: string) => { name: string; from: string } | undefined
}

export function EasemobUIKitResolver(): ComponentResolver {
  return {
    type: 'component',
    resolve: (name: string) => {
      if (name.startsWith('Uikit')) {
        const componentName = name.slice(5).toLowerCase()
        return {
          name: componentName,
          from: '@easemob/uikit',
        }
      }
    },
  }
}
