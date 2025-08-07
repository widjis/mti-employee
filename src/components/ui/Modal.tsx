import React from 'react';
import CloseIcon from './close.svg';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-lg shadow-lg p-6 max-w-[800px] w-full max-h-[90vh] overflow-y-auto"
        style={{ width: '600px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <img src={CloseIcon} alt="Close" className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;