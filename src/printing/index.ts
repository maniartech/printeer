// Printing domain - Browser and conversion pipeline

// Browser management
export { DefaultBrowserManager, DefaultBrowserFactory } from './browser';

// NOTE (BUG-013): `DefaultConverter` was an all-methods-throw stub and has been
// removed from the public surface until a real implementation exists.

// Types
export type {
    BrowserInstance,
    BrowserPoolMetrics,
    BrowserPoolState,
    PoolStatus,
    BrowserManager,
    BrowserFactory
} from './types/browser';

export type {
    OutputType,
    WaitUntilOption,
    Viewport,
    Margin,
    BrowserOptions,
    RenderOptions,
    PrinteerOptions,
    ConversionResult,
    ConversionMetrics
} from './types/conversion';

export type {
    PrinteerService,
    ServiceFactory
} from './types/service';