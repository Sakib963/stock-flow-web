import { Component, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RendererRegistry, provideRenderers } from '@app/shared/services/renderer-registry/renderer-registry.service';

@Component({ selector: 'shared-chart', template: '' })
class SharedChartComponent {}

@Component({ selector: 'order-board', template: '' })
class OrderBoardComponent {}

describe('RendererRegistry', () => {
    function featureInjector(parentProviders: unknown[], featureProviders: unknown[]) {
        TestBed.configureTestingModule({ providers: parentProviders as never[] });
        return createEnvironmentInjector(featureProviders as never[], TestBed.inject(EnvironmentInjector));
    }

    it('finds a layout the feature registered', async () => {
        const injector = featureInjector([], [provideRenderers('layout', { 'sales.order-board': () => Promise.resolve(OrderBoardComponent) })]);
        const registry = injector.get(RendererRegistry);

        expect(registry.has('layout', 'sales.order-board')).toBe(true);
        expect(await registry.load('layout', 'sales.order-board')).toBe(OrderBoardComponent);
    });

    it('still finds a shared renderer inside a feature that registered its own', async () => {
        const injector = featureInjector([provideRenderers('slot', { chart: () => Promise.resolve(SharedChartComponent) })], [provideRenderers('layout', { 'sales.order-board': () => Promise.resolve(OrderBoardComponent) })]);
        const registry = injector.get(RendererRegistry);

        expect(await registry.load('slot', 'chart')).toBe(SharedChartComponent);
        expect(await registry.load('layout', 'sales.order-board')).toBe(OrderBoardComponent);
    });

    it('answers null for a key nobody registered, and keeps kinds apart', async () => {
        const injector = featureInjector([], [provideRenderers('layout', { board: () => Promise.resolve(OrderBoardComponent) })]);
        const registry = injector.get(RendererRegistry);

        expect(registry.has('cell', 'board')).toBe(false);
        expect(await registry.load('layout', 'timeline')).toBeNull();
    });

    it('loads a renderer once, but tries again after a failed load', async () => {
        let calls = 0;
        const loader = () => (++calls === 1 ? Promise.reject(new Error('chunk failed')) : Promise.resolve(OrderBoardComponent));
        const registry = featureInjector([], [provideRenderers('layout', { board: loader })]).get(RendererRegistry);

        await expect(registry.load('layout', 'board')).rejects.toThrow('chunk failed');
        expect(await registry.load('layout', 'board')).toBe(OrderBoardComponent);
        expect(await registry.load('layout', 'board')).toBe(OrderBoardComponent);
        expect(calls).toBe(2);
    });
});
