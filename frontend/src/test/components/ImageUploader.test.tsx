import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploader } from '@features/property/upload-images/ui/ImageUploader';
import { propertyService } from '@shared/api/properties.service';

vi.mock('@shared/api/properties.service', () => ({
  propertyService: {
    uploadImages: vi.fn(),
  },
}));

function getFileInput() {
  return screen.getByLabelText(/Drop images/i) as HTMLInputElement;
}

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drop zone', () => {
    render(<ImageUploader images={[]} onChange={() => {}} />);
    expect(screen.getByText('Drop images here or click to select')).toBeDefined();
  });

  it('shows existing images as previews', () => {
    render(<ImageUploader images={['img1.jpg', 'img2.jpg']} onChange={() => {}} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
  });

  it('removes image on remove button click', () => {
    const onChange = vi.fn();
    render(<ImageUploader images={['img1.jpg']} onChange={onChange} />);
    const removeBtn = screen.getByText('×');
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows error for too many files', async () => {
    const files = [
      new File([''], '1.jpg', { type: 'image/jpeg' }),
      new File([''], '2.jpg', { type: 'image/jpeg' }),
      new File([''], '3.jpg', { type: 'image/jpeg' }),
    ] as unknown as FileList;
    render(<ImageUploader images={['existing.jpg']} onChange={() => {}} maxFiles={3} />);
    Object.defineProperty(getFileInput(), 'files', { value: files });
    fireEvent.change(getFileInput());
    await waitFor(() => {
      expect(screen.getByText('Max 3 files allowed')).toBeDefined();
    });
  });

  it('shows error for oversized file', async () => {
    const bigFile = new File(['x'.repeat(1024 * 1024 * 11)], 'big.jpg', { type: 'image/jpeg' });
    render(<ImageUploader images={[]} onChange={() => {}} maxSizeMB={10} />);
    const input = getFileInput();
    Object.defineProperty(input, 'files', { value: [bigFile] as unknown as FileList });
    fireEvent.change(input);
    await waitFor(() => {
      expect(screen.getByText(/too large/)).toBeDefined();
    });
  });

  it('shows error for invalid file type', async () => {
    const badFile = new File([''], 'doc.pdf', { type: 'application/pdf' });
    render(<ImageUploader images={[]} onChange={() => {}} />);
    const input = getFileInput();
    Object.defineProperty(input, 'files', { value: [badFile] as unknown as FileList });
    fireEvent.change(input);
    await waitFor(() => {
      expect(screen.getByText(/unsupported type/)).toBeDefined();
    });
  });

  it('uploads files successfully', async () => {
    const uploadMock = vi.mocked(propertyService.uploadImages);
    uploadMock.mockResolvedValueOnce(['uploaded1.jpg', 'uploaded2.jpg']);

    const onChange = vi.fn();
    const files = [new File([''], 'test.jpg', { type: 'image/jpeg' })] as unknown as FileList;
    render(<ImageUploader images={[]} onChange={onChange} />);
    const input = getFileInput();
    Object.defineProperty(input, 'files', { value: files });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['uploaded1.jpg', 'uploaded2.jpg']);
    });
  });

  it('handles upload failure', async () => {
    const uploadMock = vi.mocked(propertyService.uploadImages);
    uploadMock.mockRejectedValueOnce(new Error('Network Error'));

    const files = [new File([''], 'test.jpg', { type: 'image/jpeg' })] as unknown as FileList;
    render(<ImageUploader images={[]} onChange={() => {}} />);
    const input = getFileInput();
    Object.defineProperty(input, 'files', { value: files });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeDefined();
    });
  });

  it('handles upload failure with JSON error response', async () => {
    const uploadMock = vi.mocked(propertyService.uploadImages);
    uploadMock.mockRejectedValueOnce(new Error('File too large'));

    const files = [new File([''], 'test.jpg', { type: 'image/jpeg' })] as unknown as FileList;
    render(<ImageUploader images={[]} onChange={() => {}} />);
    const input = getFileInput();
    Object.defineProperty(input, 'files', { value: files });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('File too large')).toBeDefined();
    });
  });

  it('handles dragOver event', () => {
    render(<ImageUploader images={[]} onChange={() => {}} />);
    const dropZone = screen.getByText('Drop images here or click to select').closest('div')!;
    const event = new Event('dragover', { bubbles: true });
    dropZone.dispatchEvent(event);
  });

  it('handles drop event with no files', () => {
    render(<ImageUploader images={[]} onChange={() => {}} />);
    const dropZone = screen.getByText('Drop images here or click to select').closest('div')!;
    const event = new Event('drop', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [] } });
    dropZone.dispatchEvent(event);
  });
});
