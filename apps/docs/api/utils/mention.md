# Mention 工具

## filterActiveMentions

```ts
import { filterActiveMentions } from '@easemob-community/uikit-im'

const active = filterActiveMentions(text, mentionList)
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `text` | `string` | 待发送输入文本 |
| `mentionList` | `MentionContact[]` | 输入过程中记录的提及联系人 |

返回仍真实出现在文本中的 `MentionContact[]`。发送前使用它清理已经删除的 @ 文本，避免失效联系人进入 `ext.em_at_list`。

匹配会排除 `@张三丰` 中的 `@张三` 前缀误判，也会排除 `@@张三`。
