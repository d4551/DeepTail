/**
 * Host-picker copy. The Chinese dictionary is the key-set source of truth and
 * English is checked against it, so a missing or extra key is a compile error —
 * the same shape the harness client packages use.
 *
 * @module
 */

import { type LocaleId, resolveLocale } from './browser-locale.ts'

/** Simplified Chinese dictionary and key-set source of truth. */
const zh = {
  'app.name': 'DEEPTAIL',
  'picker.lede': '选择要监控的 Harness 主机。',
  'picker.aria': '已配对的主机',
  'status.loading': '正在加载主机…',
  'status.empty': '尚未配对任何主机。',
  'empty.lede': '配对一台运行 dsh web 的主机即可开始监控它的会话。',
  'host.state.online': '在线',
  'host.state.offline': '无法连接',
  'host.state.unauthorized': '需要重新配对',
  'host.state.unknown': '状态未知',
  'action.pair': '配对主机',
  'action.cancel': '取消',
  'action.retry': '重试',
  'action.connect': '连接',
  'pair.title': '配对新主机',
  'pair.linkLabel': '粘贴 dsh web 打印的链接',
  'pair.linkPlaceholder': 'https://harness.example:3080/?token=…',
  'pair.nameLabel': '这台主机的名称',
  'pair.namePlaceholder': 'Harness',
  'error.listFailed': '无法读取主机列表。',
  'error.pairFailed': '配对失败：{message}',
  'error.linkRequired': '请粘贴完整的链接。',
  'chat.placeholder': '向这个会话发送消息…',
  'chat.messageRequired': '请输入要发送的内容。',
  'chat.sent': '已发送到 {label}。',
  'shell.pickSession': '选择一个会话，在它所在主机的客户端中打开。',
  'shell.opening': '正在打开 {label} 的客户端…',
  'time.now': '刚刚',
  'time.minutes': '{n} 分钟前',
  'time.hours': '{n} 小时前',
  'time.days': '{n} 天前',
  'spawn.preset': '智能体预设',
  'spawn.cwd': '工作目录（可选）',
  'spawn.cwdPlaceholder': '/home/you/project',
  'spawn.loadingPresets': '正在加载预设…',
  'spawn.presetsFailed': '无法读取预设：{message}',
  'spawn.created': '已在 {label} 上创建会话。',
  'spawn.failed': '创建失败：{message}',
  'shell.connection': '连接',
  'shell.sessions': '会话',
  'shell.newSession': '新建会话',
  'shell.switchHost': '切换主机',
  'shell.unpair': '取消配对',
  'shell.connected': '已连接 {label}',
  'sessions.empty': '这台主机上还没有会话。',
  'sessions.loading': '正在加载会话…',
  'sessions.failed': '无法读取会话列表。',
  'sessions.running': '运行中',
  'sessions.idle': '空闲',
  'sessions.untitled': '未命名会话',
  'chat.send': '发送',
  'chat.steer': '插话',
  'chat.cancel': '停止',
  'chat.sendFailed': '发送失败：{message}',
} satisfies Record<string, string>

/** Host-picker dictionary key union. */
export type PickerKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
const en = {
  'app.name': 'DEEPTAIL',
  'picker.lede': 'Choose a Harness host to monitor.',
  'picker.aria': 'Paired hosts',
  'status.loading': 'Loading hosts…',
  'status.empty': 'No hosts paired yet.',
  'empty.lede': 'Pair a machine running dsh web to start monitoring its sessions.',
  'host.state.online': 'Online',
  'host.state.offline': 'Unreachable',
  'host.state.unauthorized': 'Needs re-pairing',
  'host.state.unknown': 'Status unknown',
  'action.pair': 'Pair a host',
  'action.cancel': 'Cancel',
  'action.retry': 'Retry',
  'action.connect': 'Connect',
  'pair.title': 'Pair a new host',
  'pair.linkLabel': 'Paste the link that dsh web printed',
  'pair.linkPlaceholder': 'https://harness.example:3080/?token=…',
  'pair.nameLabel': 'Name for this host',
  'pair.namePlaceholder': 'Harness',
  'error.listFailed': 'Could not read the host list.',
  'error.pairFailed': 'Pairing failed: {message}',
  'error.linkRequired': 'Paste the whole link.',
  'chat.placeholder': 'Message this session…',
  'chat.messageRequired': 'Type something to send.',
  'chat.sent': 'Sent to {label}.',
  'shell.pickSession': 'Choose a session to open it in its host\u2019s client.',
  'shell.opening': 'Opening the client for {label}…',
  'time.now': 'just now',
  'time.minutes': '{n}m ago',
  'time.hours': '{n}h ago',
  'time.days': '{n}d ago',
  'spawn.preset': 'Agent preset',
  'spawn.cwd': 'Working directory (optional)',
  'spawn.cwdPlaceholder': '/home/you/project',
  'spawn.loadingPresets': 'Loading presets…',
  'spawn.presetsFailed': 'Could not read presets: {message}',
  'spawn.created': 'Created a session on {label}.',
  'spawn.failed': 'Create failed: {message}',
  'shell.connection': 'Connection',
  'shell.sessions': 'Sessions',
  'shell.newSession': 'New session',
  'shell.switchHost': 'Switch host',
  'shell.unpair': 'Unpair',
  'shell.connected': 'Connected to {label}',
  'sessions.empty': 'No sessions on this host yet.',
  'sessions.loading': 'Loading sessions…',
  'sessions.failed': 'Could not read the session list.',
  'sessions.running': 'Running',
  'sessions.idle': 'Idle',
  'sessions.untitled': 'Untitled session',
  'chat.send': 'Send',
  'chat.steer': 'Steer',
  'chat.cancel': 'Stop',
  'chat.sendFailed': 'Send failed: {message}',
} satisfies Record<PickerKey, string>

const DICTIONARIES: Readonly<Record<LocaleId, Record<PickerKey, string>>> = { en, zh }

/** Resolves one key, substituting `{name}` placeholders. */
export type Translate = (key: PickerKey, params?: Readonly<Record<string, unknown>>) => string

/**
 * Build the translator for a locale, and set `<html lang>` to match.
 * @param locale - the locale to use; defaults to the browser's preference.
 * @returns a translator over the host-picker dictionary.
 */
export function createTranslate(locale: LocaleId = resolveLocale()): Translate {
  const dictionary = DICTIONARIES[locale]
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale
  }
  return (key, params) => {
    const template = dictionary[key]
    if (params === undefined) return template
    return template.replaceAll(/\{(\w+)\}/gu, (match, name: string) => (name in params ? String(params[name]) : match))
  }
}
