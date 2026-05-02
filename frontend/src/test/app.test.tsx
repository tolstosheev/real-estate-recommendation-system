import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../App';

test('renders app component', () => {
  render(<App />);
  expect(screen.getByText(/Get started/i)).toBeInTheDocument();
});
