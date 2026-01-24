# 🎨 Icon Placeholders for Menu

## New Menu Items Added

Two new icons are referenced in `menu.ts` but may not exist yet:

### 1. **Alerts & Low Stock Icon**

```typescript
icon: 'assets/icons/alert.svg';
```

**Suggested alternatives (if icon doesn't exist):**

- Use: `nzType="bell"` or `nzType="warning"` or `nzType="alert"`
- Or create/add an `alert.svg` file to `assets/icons/`

### 2. **Analytics Icon**

```typescript
icon: 'assets/icons/analytics.svg';
```

**Suggested alternatives (if icon doesn't exist):**

- Use: `nzType="bar-chart"` or `nzType="line-chart"` or `nzType="pie-chart"`
- Or create/add an `analytics.svg` file to `assets/icons/`

## Temporary Fix (if icons are missing)

If you get errors about missing icons, you can temporarily update `menu.ts`:

```typescript
// Change from:
{
  icon: 'assets/icons/alert.svg',
  label: 'Alerts & Low Stock',
  route: '/configuration/alerts',
}

// To (using ng-zorro icon):
{
  icon: 'bell',  // This will use nz-icon
  label: 'Alerts & Low Stock',
  route: '/configuration/alerts',
}
```

## Where to Add Custom Icons

If you want to add custom SVG icons:

1. Place them in: `src/assets/icons/`
2. Name them: `alert.svg` and `analytics.svg`
3. Ensure they follow the same format as other icons in that folder
