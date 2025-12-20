/**
 * 항복 확인 모달 컴포넌트
 */

import React from 'react';

const ResignConfirmModal = ({ onConfirm, onCancel }) => {
    return (
        <div className="overlay" style={{ zIndex: 9998 }}>
            <div className="modal resign-confirm-modal">
                <h3>정말 항복하시겠습니까?</h3>
                <p style={{ marginTop: '10px', color: '#666' }}>
                    항복하면 상대방이 승리합니다.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center', alignItems: 'center' }}>
                    <button
                        className="menu-btn btn-exit"
                        onClick={onConfirm}
                        style={{ width: '100px', height: '45px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        예
                    </button>
                    <button
                        className="menu-btn btn-close"
                        onClick={onCancel}
                        style={{ width: '100px', height: '45px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        아니오
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ResignConfirmModal);
