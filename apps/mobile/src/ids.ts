import { uuidV7 } from '@smartnomic/domain';
import * as Crypto from 'expo-crypto';

/** Id de un movimiento nuevo. Se genera en la app para que reenviar no duplique (RF-015). */
export function newTransactionId(): string {
  return uuidV7(Date.now(), Crypto.getRandomBytes(10));
}
