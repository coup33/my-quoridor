/**
 * 3D 폰(말) 컴포넌트
 * 체스 폰 스타일의 3D 말 렌더링
 */

import React from 'react';

const Pawn3D = ({ position, isWhite }) => {
    const [x, z] = position;
    const posX = (x - 4) * 1.15;
    const posZ = (z - 4) * 1.15;

    const color = isWhite ? "#ffffff" : "#2a2a2a";
    const emissive = isWhite ? "#ffffff" : "#333333";

    return (
        <group position={[posX, 0.2, posZ]}>
            {/* 베이스 */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.35, 0.4, 0.2, 32]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.4}
                    roughness={0.3}
                    emissive={emissive}
                    emissiveIntensity={0.05}
                />
            </mesh>
            {/* 목 */}
            <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.2, 0.3, 0.3, 32]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.4}
                    roughness={0.3}
                />
            </mesh>
            {/* 머리 (구체) */}
            <mesh position={[0, 0.6, 0]}>
                <sphereGeometry args={[0.25, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.5}
                    roughness={0.2}
                    emissive={emissive}
                    emissiveIntensity={0.08}
                />
            </mesh>
        </group>
    );
};

export default React.memo(Pawn3D);
