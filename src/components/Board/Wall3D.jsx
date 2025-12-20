/**
 * 3D 벽 관련 컴포넌트들
 * Wall3D: 설치된 벽
 * WallTarget3D: 벽 프리뷰/호버 홀로그램
 * WallHitbox3D: 보이지 않는 마우스 감지 영역
 */

import React from 'react';

/**
 * 벽 위치 계산 헬퍼 함수
 */
const getWallPosition = (x, y, orientation) => {
    const posX = (x - 4) * 1.15 + 0.575;
    const posZ = (y - 4) * 1.15 + 0.575;
    const rotY = orientation === 'h' ? 0 : Math.PI / 2;
    return { posX, posZ, rotY };
};

/**
 * 설치된 3D 벽 컴포넌트
 */
export const Wall3D = ({ wall, isLatest }) => {
    const { x, y, orientation } = wall;
    const { posX, posZ, rotY } = getWallPosition(x, y, orientation);

    const color = isLatest ? "#fbbf24" : "#ef4444";
    const emissiveIntensity = isLatest ? 0.6 : 0.3;

    return (
        <mesh position={[posX, 0.425, posZ]} rotation={[0, rotY, 0]}>
            <boxGeometry args={[2.1, 0.5, 0.12]} />
            <meshStandardMaterial
                color={color}
                metalness={0.6}
                roughness={0.2}
                emissive={color}
                emissiveIntensity={emissiveIntensity}
            />
        </mesh>
    );
};

/**
 * 벽 타겟 (홀로그램 스타일 프리뷰)
 */
export const WallTarget3D = ({ x, y, orientation, isPreview, canPlace, onClick }) => {
    const { posX, posZ, rotY } = getWallPosition(x, y, orientation);

    const handleClick = (e) => {
        e.stopPropagation();
        if (canPlace) {
            onClick(x, y, orientation);
        }
    };

    if (!canPlace && !isPreview) return null;

    // 프리뷰(고정됨)일 때와 호버일 때 다른 스타일
    const color = isPreview ? "#00ffff" : "#00d4ff";
    const opacity = isPreview ? 0.6 : 0.4;
    const emissiveIntensity = isPreview ? 0.5 : 0.3;

    return (
        <mesh
            position={[posX, 0.425, posZ]}
            rotation={[0, rotY, 0]}
            onClick={handleClick}
        >
            <boxGeometry args={[2.1, 0.5, 0.12]} />
            <meshStandardMaterial
                color={color}
                metalness={0.6}
                roughness={0.2}
                emissive={color}
                emissiveIntensity={emissiveIntensity}
                transparent
                opacity={opacity}
                depthWrite={false}
            />
        </mesh>
    );
};

/**
 * 보이지 않는 벽 히트박스 (마우스 이벤트 감지용)
 */
export const WallHitbox3D = ({ x, y, orientation, onHover, onClick }) => {
    const { posX, posZ, rotY } = getWallPosition(x, y, orientation);

    const handleClick = (e) => {
        e.stopPropagation();
        onClick(x, y, orientation);
    };

    return (
        <mesh
            position={[posX, 0.425, posZ]}
            rotation={[0, rotY, 0]}
            onClick={handleClick}
            onPointerOver={(e) => {
                e.stopPropagation();
                onHover(x, y, orientation);
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                onHover(null, null, null);
            }}
        >
            <boxGeometry args={[2.1, 0.5, 0.12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
    );
};
