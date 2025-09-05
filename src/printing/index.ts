// Printing domain - Browser and conversion pipeline

// Browser management
export { DefaultBrowserManager, DefaultBrowserFactory } from './browser';

// Converter
export { DefaultConverter } from './converter';

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