import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DiagnosticsService {
  @Cron(CronExpression.EVERY_30_SECONDS)
  checkoutActiveHandles() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handles = (process as any)._getActiveHandles();
    console.debug(`\n[DEBUG] Active Handles (${handles.length}):`);

    handles.forEach((handle, index) => {
      const name = handle.constructor?.name || typeof handle;
      console.debug(`\n[${index}] Type: ${name}`);

      // Print details depending on type
      switch (name) {
        case 'Socket':
          console.debug({
            remoteAddress: handle.remoteAddress,
            remotePort: handle.remotePort,
            localPort: handle.localPort,
            readable: handle.readable,
            writable: handle.writable,
          });
          break;

        case 'Timeout':
          console.debug({
            _idleTimeout: handle._idleTimeout,
            _onTimeout: handle._onTimeout?.name || 'anonymous',
          });
          break;

        case 'FSReqCallback': // e.g., fs.open or fs.read
          console.debug(handle);
          break;

        default:
          console.debug('Details:', handle);
          break;
      }
    });
  }
}
