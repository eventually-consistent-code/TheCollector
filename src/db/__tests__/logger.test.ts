/**
 * Purpose: Quiet-logger tests — benign RSocket closes downgrade to warn,
 * real errors stay errors.
 * Author(s): John Reed
 */

import { LogLevels } from '@powersync/common';

import { createQuietLogger } from '../logger';

let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

test('benign RSocket close logs at warn, not error', () => {
  const logger = createQuietLogger('Test');
  logger.log({
    level: LogLevels.error,
    message: 'RSocket error Error: Closed. Original cause [Error: Stream end encountered].',
  });
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledTimes(1);
});

test('real errors pass through at error level', () => {
  const logger = createQuietLogger('Test');
  logger.log({ level: LogLevels.error, message: 'Could not apply checkpoint: corrupt' });
  expect(errorSpy).toHaveBeenCalledTimes(1);
  expect(warnSpy).not.toHaveBeenCalled();
});

test('non-error levels untouched', () => {
  const logger = createQuietLogger('Test');
  logger.log({ level: LogLevels.warn, message: 'Stream end encountered' });
  expect(warnSpy).toHaveBeenCalledTimes(1);
  expect(errorSpy).not.toHaveBeenCalled();
});
