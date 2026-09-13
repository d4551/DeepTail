/**
 * The bundle-execute half of the carrier: the failure a page script reports.
 *
 * `tests/transport.spec.ts` registers happy-dom so a disabled `blob:` load is
 * reported as the success a real browser reports, because its cases drive the
 * load the carrier's contract waits on. The failure half needs the other
 * registration: the default one reports the disabled load as the failure it
 * is, which is the `error` event the carrier turns into its own refusal — the
 * message an operator reads when a bundle the host shipped cannot run.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { resetDocument } from './dom.ts'
import { failBundleExecute, refusalOf, resetTransportDouble, transport } from './transport-double.ts'

if (GlobalRegistrator.isRegistered) {
  await GlobalRegistrator.unregister()
}
GlobalRegistrator.register()

beforeEach(() => {
  resetDocument()
  // The double's module state is shared across the suites of one process, so a
  // refusal another suite planted is still planted here until it is reset.
  resetTransportDouble()
})

describe('a bundle the page refuses to run', () => {
  it('names the bundle whose script failed to execute', async () => {
    const carrier = transport.createCarrier('host-1')
    const failure = await refusalOf(carrier.loadBundle('https://host.example/plugins/broken.js'))
    expect(failure?.message).toBe('deeptail: bundle https://host.example/plugins/broken.js failed to execute')
  })

  it('drops the script node when the execute waiter is refused', async () => {
    const element = document.createElement('script')
    document.head.append(element)
    const failure = await new Promise<Error>((resolve) => {
      failBundleExecute(element, 'https://host.example/plugins/broken.js', resolve)
    })
    expect(failure.message).toBe('deeptail: bundle https://host.example/plugins/broken.js failed to execute')
    expect(element.isConnected).toBe(false)
  })
})
