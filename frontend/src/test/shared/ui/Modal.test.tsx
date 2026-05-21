import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@shared/ui/Modal';

describe('Modal', () => {
  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByText('Modal content')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden Modal">
        <p>Should not appear</p>
      </Modal>
    );
    expect(screen.queryByText('Hidden Modal')).toBeNull();
    expect(screen.queryByText('Should not appear')).toBeNull();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Modal">
        <p>content</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('Modal').closest('.modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Modal">
        <p>content</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('content'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
