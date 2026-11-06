# 消息格式化工具

从 `@easemob-community/uikit-im` 导入消息类型与摘要格式化函数。

## createMessageFormatter

```ts
createMessageFormatter(
  t: (key: string) => string,
): (msg: string, type?: string) => string
```

创建消息摘要格式化函数。文本消息返回原文，图片、语音、视频、文件、CMD、自定义和位置消息使用 `t` 提供的本地化摘要。

```ts
const format = createMessageFormatter(t)
const preview = format(message.text, message.type)
```

## isValidMessageType

```ts
isValidMessageType(value: string): value is MessageTypeValue
```

判断字符串是否属于公开消息类型常量，可作为 TypeScript 类型守卫。
