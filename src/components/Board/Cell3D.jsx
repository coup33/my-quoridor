/**
 * 3D 셀 컴포넌트
 * 보드의 각 칸을 3D로 렌더링
 */

import React, { useRef } from 'react';

const Cell3D = ({ x, y, canMove, onClick }) => {
    const meshRef = useRef();
    const posX = (x - 4) * 1.15;
    const posZ = (y - 4) * 1.15;

    const handleClick = (e) => {
        e.stopPropagation();
        onClick(x, y);
    };

    return (
        <mesh
            ref={meshRef}
            position={[posX, 0.1, posZ]}
            onClick={handleClick}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                if (meshRef.current) meshRef.current.material.emissiveIntensity = canMove ? 0.6 : 0.15;
            }}
            onPointerOut={(e) => {
                document.body.style.cursor = 'default';
                if (meshRef.current) meshRef.current.material.emissiveIntensity = canMove ? 0.4 : 0;
            }}
        >
            <boxGeometry args={[1, 0.15, 1]} />
            <meshStandardMaterial
                color={canMove ? "#00d4ff" : "#6a6a75"}
                metalness={0.3}
                roughness={0.4}
                emissive={canMove ? "#00d4ff" : "#3a3a45"}
                emissiveIntensity={canMove ? 0.4 : 0}
            />
        </mesh>
    );
};

export default React.memo(Cell3D);
