const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

// BreadcrumbList JSON-LD. Pass the trail below Home, e.g.
// breadcrumbJsonLd([{ name: 'QAuth', path: '/qauth' }])
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: `${siteUrl}${item.path}`,
      })),
    ],
  };
}
