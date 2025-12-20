/**
 * 3D 보드 베이스 컴포넌트
 * 보드판 바닥면 렌더링
 */

import React from 'react';

const BoardBase = () => {
    return (
        <mesh position={[0, -0.05, 0]} receiveShadow>
            <boxGeometry args={[11, 0.1, 11]} />
            <meshStandardMaterial
                color="#2a2a3e"
                metalness={0.3}
                roughness={0.7}
            />
        </mesh>
    );
};

export default React.memo(BoardBase);
