import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { WsAuthService } from './ws-auth.service';

/**
 * Socket.IO setup shared by the live gateways (dispatch offers, tracking).
 * Global so any gateway can authenticate handshakes via WsAuthService.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [WsAuthService],
  exports: [WsAuthService],
})
export class WebsocketsModule {}
