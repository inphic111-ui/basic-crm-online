import React, { useState, useEffect } from 'react';

export default function ClassifyModal({ isOpen, record, onClose, onSave, customers, businessNames }) {
  const [formData, setFormData] = useState({
    customer_id: '',
    business_name: ''
  });

  useEffect(() => {
    if (record) {
      setFormData({
        customer_id: record.customer_id || '',
        business_name: record.business_name || ''
      });
    }
  }, [record]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    if (!formData.customer_id || !formData.business_name) {
      alert('Please select both customer and business person');
      return;
    }
    onSave(formData);
  };

  if (!isOpen || !record) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎵 Edit Audio Classification</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>File Name:</label>
            <p className="file-name">{record.audio_filename || `Recording_${record.id}`}</p>
          </div>

          <div className="form-group">
            <label htmlFor="customer_id">Customer:</label>
            <select
              id="customer_id"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">-- Select Customer --</option>
              {customers && customers.length > 0 ? (
                customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || `Customer ${customer.id}`}
                  </option>
                ))
              ) : (
                <option disabled>No customers available</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="business_name">Business Person:</label>
            <select
              id="business_name"
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">-- Select Business Person --</option>
              {businessNames && businessNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Confirm & Lock</button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 90%;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .file-name {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          margin: 0;
          font-size: 14px;
          color: #666;
          word-break: break-all;
        }

        .form-select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .form-select:focus {
          outline: none;
          border-color: #2196F3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 20px;
          border-top: 1px solid #eee;
        }

        .btn-cancel,
        .btn-save {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #f5f5f5;
          color: #333;
        }

        .btn-cancel:hover {
          background: #e0e0e0;
        }

        .btn-save {
          background: #2196F3;
          color: white;
        }

        .btn-save:hover {
          background: #1976D2;
        }

        .btn-save:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
