import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RouteDocumentTitle } from './DocumentTitle';

function NavigateTo({ path }: { path: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(path)}>Navigate</button>;
}

async function expectRouteTitle(path: string, expectedTitle: string) {
  const { getByRole } = render(
    <MemoryRouter initialEntries={['/']}>
      <RouteDocumentTitle />
      <NavigateTo path={path} />
    </MemoryRouter>,
  );

  await waitFor(() => expect(document.title).toBe('Cockpit — Workstream Cockpit'));
  if (path !== '/') fireEvent.click(getByRole('button', { name: 'Navigate' }));
  await waitFor(() => expect(document.title).toBe(expectedTitle));
}

describe('RouteDocumentTitle', () => {
  it.each([
    ['/timeline', 'Timeline — Workstream Cockpit'],
    ['/archive', 'Archive — Workstream Cockpit'],
    ['/login', 'Login — Workstream Cockpit'],
    ['/settings/categories', 'Categories — Workstream Cockpit'],
    ['/settings/appearance', 'Appearance — Workstream Cockpit'],
    ['/settings/personal-access-tokens', 'Personal Access Tokens — Workstream Cockpit'],
    ['/workstreams/42', 'Workstream — Workstream Cockpit'],
  ])('updates the title after client-side navigation to %s', async (path, expectedTitle) => {
    await expectRouteTitle(path, expectedTitle);
  });
});
