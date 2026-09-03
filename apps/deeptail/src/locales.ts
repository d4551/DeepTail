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
  'status.offline': '与 {label} 的连接已断开，显示的是最后一次读取的结果。',
  'empty.lede': '配对一台运行 dsh web 的主机即可开始监控它的会话。',
  'host.state.online': '在线',
  'host.state.offline': '无法连接',
  'host.state.unauthorized': '需要重新配对',
  'host.state.forbidden': '无权访问这台主机',
  'host.state.unknown': '状态未知',
  'action.pair': '配对主机',
  'action.cancel': '取消',
  'action.retry': '重试',
  'pair.title': '配对新主机',
  'pair.linkLabel': '粘贴 dsh web 打印的链接',
  'pair.linkPlaceholder': 'https://harness.example:3080/?token=…',
  'pair.nameLabel': '这台主机的名称',
  'pair.namePlaceholder': 'Harness',
  'error.listFailed': '无法读取主机列表。',
  'error.pairFailed': '配对失败：{message}',
  'error.linkRequired': '请粘贴完整的链接。',
  'error.linkInvalid': '这不是一个完整的链接。请粘贴 dsh web 打印的整行内容。',
  'error.http': '{endpoint} 返回了 HTTP {status}。',
  'error.protocol': '{endpoint} 的响应不符合协议：{detail}',
  'error.transport': '无法连接到 {endpoint}：{detail}',
  'chat.placeholder': '向这个会话发送消息…',
  'chat.messageLabel': '要发送的消息',
  'chat.messageRequired': '请输入要发送的内容。',
  'chat.sent': '已发送到 {label}。',
  'shell.pickSession': '选择一个会话，在它所在主机的客户端中打开。',
  'shell.opening': '正在打开 {label} 的客户端…',
  'spawn.preset': '智能体预设',
  'spawn.cwd': '工作目录（可选）',
  'spawn.cwdPlaceholder': '/home/you/project',
  'spawn.presetPlaceholder': '留空即使用主机默认预设',
  'spawn.presetUnknown': '这台主机没有该预设。可用：{presets}',
  'spawn.created': '已在 {label} 上创建会话。',
  'spawn.failed': '创建失败：{message}',
  'spawn.hostOption': '{label} — {origin}',
  'shell.connection': '连接',
  'shell.navLabel': '会话导航',
  'shell.sessionsHeading': '会话',
  'shell.sessionsSection': '会话',
  'shell.newSession': '新建会话',
  'shell.switchHost': '切换主机',
  'shell.unpair': '取消配对',
  'shell.repair': '重新配对这台主机',
  'shell.openSessions': '显示会话列表',
  'shell.closeSessions': '隐藏会话列表',
  'shell.backToFleet': '返回会话总览',
  'sessions.empty': '这台主机上还没有会话。',
  'sessions.loading': '正在加载会话…',
  'sessions.stopFailed': '无法停止会话：{message}',
  'sessions.running': '运行中',
  'sessions.idle': '空闲',
  'sessions.untitled': '未命名会话',
  'sessions.count': '{count} 个会话',
  'sessions.messageAction': '发送消息',
  'sessions.messageAria': '向 {title} 发送消息',
  'sessions.stop': '停止',
  'sessions.stopAria': '停止 {title}',
  'chat.send': '发送',
  'chat.steer': '插话',
  'chat.sendFailed': '发送失败：{message}',
  'tailnet.action': '从 Tailscale 中选择',
  'tailnet.connectTitle': '连接你的 tailnet',
  'tailnet.connectLede':
    'DeepTail 通过 Tailscale API 列出你 tailnet 中的机器。凭据保存在本设备的系统密钥库中，不会进入页面。',
  'tailnet.kindLegend': '凭据类型',
  'tailnet.kindApiKey': 'API 密钥（tskey-api-…，到期日固定）',
  'tailnet.kindOauth': 'OAuth 客户端（长期集成，需 devices:core 权限）',
  'tailnet.keyLabel': 'API 密钥',
  'tailnet.keyPlaceholder': 'tskey-api-…',
  'tailnet.clientIdLabel': 'OAuth 客户端 ID',
  'tailnet.clientIdPlaceholder': 'k123456CNTRL',
  'tailnet.clientSecretLabel': 'OAuth 客户端密钥',
  'tailnet.secretPlaceholder': 'tskey-client-…',
  'tailnet.tailnetLabel': 'Tailnet（可选）',
  'tailnet.tailnetPlaceholder': '留空表示该凭据所属的 tailnet',
  'tailnet.connect': '连接',
  'tailnet.disconnect': '断开 Tailscale',
  'tailnet.listTitle': '你 tailnet 中的机器',
  'tailnet.listAria': 'Tailnet 机器',
  'tailnet.empty': '这个 tailnet 里没有可配对的机器。',
  'tailnet.deviceSubtitle': '{os} · {origin}',
  'tailnet.alreadyPaired': '已配对 · 打开',
  'tailnet.unapproved': '等待管理员批准',
  'tailnet.incomplete': '请填写这种凭据所需的全部字段。',
  'tailnet.connectFailed': '无法列出 tailnet：{message}',
  'tailnet.listFailed': '无法读取 tailnet 机器列表：{message}',
  'tailnet.pairTitle': '配对 {label}',
  'tailnet.tokenLabel': '在 {label} 上运行 dsh web 打印的令牌',
  'tailnet.tokenPlaceholder': '粘贴令牌',
  'tailnet.tokenRequired': '请粘贴该主机打印的令牌。',
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
  'status.offline': 'Lost the connection to {label}. Showing the last read.',
  'empty.lede': 'Pair a machine running dsh web to start monitoring its sessions.',
  'host.state.online': 'Online',
  'host.state.offline': 'Unreachable',
  'host.state.unauthorized': 'Needs re-pairing',
  'host.state.forbidden': 'Not permitted on this host',
  'host.state.unknown': 'Status unknown',
  'action.pair': 'Pair a host',
  'action.cancel': 'Cancel',
  'action.retry': 'Retry',
  'pair.title': 'Pair a new host',
  'pair.linkLabel': 'Paste the link that dsh web printed',
  'pair.linkPlaceholder': 'https://harness.example:3080/?token=…',
  'pair.nameLabel': 'Name for this host',
  'pair.namePlaceholder': 'Harness',
  'error.listFailed': 'Could not read the host list.',
  'error.pairFailed': 'Pairing failed: {message}',
  'error.linkRequired': 'Paste the whole link.',
  'error.linkInvalid': 'That is not a whole link. Paste the entire line dsh web printed.',
  'error.http': '{endpoint} returned HTTP {status}.',
  'error.protocol': '{endpoint} answered outside the protocol: {detail}',
  'error.transport': 'Could not reach {endpoint}: {detail}',
  'chat.placeholder': 'Message this session…',
  'chat.messageLabel': 'Message to send',
  'chat.messageRequired': 'Type something to send.',
  'chat.sent': 'Sent to {label}.',
  'shell.pickSession': 'Choose a session to open it in its host\u2019s client.',
  'shell.opening': 'Opening the client for {label}…',
  'spawn.preset': 'Agent preset',
  'spawn.cwd': 'Working directory (optional)',
  'spawn.cwdPlaceholder': '/home/you/project',
  'spawn.presetPlaceholder': 'Leave empty for the host default',
  'spawn.presetUnknown': 'This host has no such preset. Available: {presets}',
  'spawn.created': 'Created a session on {label}.',
  'spawn.failed': 'Create failed: {message}',
  'spawn.hostOption': '{label} \u2014 {origin}',
  'shell.connection': 'Connection',
  'shell.navLabel': 'Session navigation',
  'shell.sessionsHeading': 'Sessions',
  'shell.sessionsSection': 'Sessions',
  'shell.newSession': 'New session',
  'shell.switchHost': 'Switch host',
  'shell.unpair': 'Unpair',
  'shell.repair': 'Re-pair this host',
  'shell.openSessions': 'Show the session list',
  'shell.closeSessions': 'Hide the session list',
  'shell.backToFleet': 'Back to all sessions',
  'sessions.empty': 'No sessions on this host yet.',
  'sessions.loading': 'Loading sessions…',
  'sessions.stopFailed': 'Could not stop the session: {message}',
  'sessions.running': 'Running',
  'sessions.idle': 'Idle',
  'sessions.untitled': 'Untitled session',
  'sessions.count': '{count} sessions',
  'sessions.messageAction': 'Send',
  'sessions.messageAria': 'Message {title}',
  'sessions.stop': 'Stop',
  'sessions.stopAria': 'Stop {title}',
  'chat.send': 'Send',
  'chat.steer': 'Steer',
  'chat.sendFailed': 'Send failed: {message}',
  'tailnet.action': 'Choose from Tailscale',
  'tailnet.connectTitle': 'Connect your tailnet',
  'tailnet.connectLede':
    'DeepTail lists the machines on your tailnet through the Tailscale API. The credential is kept in this device\u2019s system keychain and never reaches the page.',
  'tailnet.kindLegend': 'Credential',
  'tailnet.kindApiKey': 'API key (tskey-api-…, expires on a fixed date)',
  'tailnet.kindOauth': 'OAuth client (long-running, needs the devices:core scope)',
  'tailnet.keyLabel': 'API key',
  'tailnet.keyPlaceholder': 'tskey-api-…',
  'tailnet.clientIdLabel': 'OAuth client ID',
  'tailnet.clientIdPlaceholder': 'k123456CNTRL',
  'tailnet.clientSecretLabel': 'OAuth client secret',
  'tailnet.secretPlaceholder': 'tskey-client-…',
  'tailnet.tailnetLabel': 'Tailnet (optional)',
  'tailnet.tailnetPlaceholder': 'Leave empty for the one this credential belongs to',
  'tailnet.connect': 'Connect',
  'tailnet.disconnect': 'Disconnect Tailscale',
  'tailnet.listTitle': 'Machines on your tailnet',
  'tailnet.listAria': 'Tailnet machines',
  'tailnet.empty': 'No pairable machines on this tailnet.',
  'tailnet.deviceSubtitle': '{os} · {origin}',
  'tailnet.alreadyPaired': 'Already paired · open',
  'tailnet.unapproved': 'Waiting for an admin to approve it',
  'tailnet.incomplete': 'Fill in every field this credential needs.',
  'tailnet.connectFailed': 'Could not list the tailnet: {message}',
  'tailnet.listFailed': 'Could not read the tailnet machines: {message}',
  'tailnet.pairTitle': 'Pair {label}',
  'tailnet.tokenLabel': 'Token that dsh web printed on {label}',
  'tailnet.tokenPlaceholder': 'Paste the token',
  'tailnet.tokenRequired': 'Paste the token that host printed.',
} satisfies Record<PickerKey, string>

/**
 * Every dictionary, by locale.
 *
 * Exported so the checks that hold the two in step read the objects rather than
 * the file's text. A reader that matched on two-space indentation and single
 * quotes compared two empty key sets the moment the file was reformatted, and
 * said nothing.
 */
export const DICTIONARIES: Readonly<Record<LocaleId, Record<PickerKey, string>>> = { en, zh }

/** Resolves one key, substituting `{name}` placeholders. */
export interface Translate {
  /**
   * Render one key.
   * @param key - the dictionary key.
   * @param params - values for the key's placeholders.
   */
  (key: PickerKey, params?: Readonly<Record<string, string | number>>): string
  /**
   * The locale this translator speaks.
   *
   * Carried here because the platform's own formatters take a locale and there
   * is no reason for a surface to guess one: the copy source already knows.
   */
  readonly locale: LocaleId
}

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
  const translate = (key: PickerKey, params?: Readonly<Record<string, string | number>>): string => {
    const template = dictionary[key]
    if (params === undefined) return template
    return template.replaceAll(/\{(\w+)\}/gu, (match, name: string): string => {
      const value = params[name]
      return value === undefined ? match : String(value)
    })
  }
  return Object.assign(translate, { locale })
}
