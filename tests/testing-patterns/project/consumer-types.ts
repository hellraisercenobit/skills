import { expectTypeOf } from 'vitest';
import { paymentLabel, receipt } from './contracts.ts';

expectTypeOf(receipt('EUR', 10).currency).toEqualTypeOf<'EUR'>();
paymentLabel({ kind: 'paid', cents: 1 });
// @ts-expect-error A paid payment requires its amount.
paymentLabel({ kind: 'paid' });
// @ts-expect-error The public currency is a string.
receipt(42, 10);
