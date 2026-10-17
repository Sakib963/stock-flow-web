import { TestBed } from '@angular/core/testing';
import { SparklineComponent } from './sparkline.component';

const draw = async (values: number[]) => {
    await TestBed.configureTestingModule({ imports: [SparklineComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SparklineComponent);
    fixture.componentRef.setInput('values', values);
    fixture.detectChanges();
    return { component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
};

describe('SparklineComponent', () => {
    it('draws nothing from a single day', async () => {
        const { element } = await draw([500]);
        expect(element.querySelector('svg')).toBeNull();
    });

    it('spreads the days across the width with the highest day at the top', async () => {
        const { component } = await draw([0, 100, 50]);
        const points = component.points()!;
        expect(points.map(([x]) => x)).toEqual([0, 60, 120]);
        expect(points[1][1]).toBe(1);
        expect(points[0][1]).toBe(31);
    });
});
