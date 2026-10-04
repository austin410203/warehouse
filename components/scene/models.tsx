'use client';
// Low-poly procedural models — no external assets.
import { RoundedBox } from '@react-three/drei';

const BLUE = '#2f6bff';
const DEEP = '#1f4fd6';
const WHEEL = '#1d2433';

export function Pallet({ color = '#c9915a', boxes = 4, wrap = false }: { color?: string; boxes?: number; wrap?: boolean }) {
  const layers = Math.max(1, Math.ceil(boxes / 4));
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.12, 1.1]} />
        <meshStandardMaterial color="#b98a55" />
      </mesh>
      {Array.from({ length: layers }).map((_, l) =>
        [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]].slice(0, Math.min(4, boxes - l * 4)).map(([x, z], i) => (
          <mesh key={`${l}-${i}`} position={[x, 0.36 + l * 0.48, z]} castShadow>
            <boxGeometry args={[0.5, 0.46, 0.5]} />
            <meshStandardMaterial color={wrap ? '#e9eef7' : color} roughness={0.8} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.32, 0.32, 0.26, 16]} />
      <meshStandardMaterial color={WHEEL} />
    </mesh>
  );
}

export function TruckModel({ kind, ghost = false }: { kind: 'inbound' | 'outbound'; ghost?: boolean }) {
  const cab = kind === 'inbound' ? BLUE : '#0f9d77';
  const opacity = ghost ? 0.45 : 1;
  return (
    <group>
      {/* trailer (rear toward −z) */}
      <RoundedBox args={[1.9, 1.9, 3.4]} radius={0.08} position={[0, 1.35, -0.7]} castShadow>
        <meshStandardMaterial color="#f7f9fc" transparent={ghost} opacity={opacity} />
      </RoundedBox>
      <mesh position={[0.96, 1.45, -0.7]}>
        <planeGeometry args={[0.01, 0.01]} />
      </mesh>
      {/* blue stripe on trailer sides */}
      {[-0.96, 0.96].map((x) => (
        <mesh key={x} position={[x, 0.75, -0.7]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[3.3, 0.22]} />
          <meshStandardMaterial color={cab} transparent={ghost} opacity={opacity} />
        </mesh>
      ))}
      {/* chassis */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[1.6, 0.25, 4.6]} />
        <meshStandardMaterial color="#2a3245" transparent={ghost} opacity={opacity} />
      </mesh>
      {/* cab */}
      <RoundedBox args={[1.9, 1.5, 1.2]} radius={0.12} position={[0, 1.15, 1.75]} castShadow>
        <meshStandardMaterial color={cab} transparent={ghost} opacity={opacity} />
      </RoundedBox>
      <mesh position={[0, 1.45, 2.36]}>
        <boxGeometry args={[1.6, 0.6, 0.02]} />
        <meshStandardMaterial color="#cfe3ff" metalness={0.2} roughness={0.1} transparent={ghost} opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.6, 2.36]}>
        <boxGeometry args={[1.7, 0.25, 0.04]} />
        <meshStandardMaterial color={DEEP} />
      </mesh>
      {!ghost && (
        <>
          <Wheel position={[0.85, 0.32, 1.7]} />
          <Wheel position={[-0.85, 0.32, 1.7]} />
          <Wheel position={[0.85, 0.32, -1.6]} />
          <Wheel position={[-0.85, 0.32, -1.6]} />
          <Wheel position={[0.85, 0.32, -0.9]} />
          <Wheel position={[-0.85, 0.32, -0.9]} />
        </>
      )}
    </group>
  );
}

export function ForkliftModel({ carrying, color = '#f5b301' }: { carrying: boolean; color?: string }) {
  return (
    <group scale={0.85}>
      <RoundedBox args={[0.9, 0.55, 1.3]} radius={0.08} position={[0, 0.45, -0.1]} castShadow>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      {/* counterweight */}
      <mesh position={[0, 0.55, -0.7]} castShadow>
        <boxGeometry args={[0.92, 0.5, 0.3]} />
        <meshStandardMaterial color="#2a3245" />
      </mesh>
      {/* overhead guard */}
      {[[-0.38, -0.45], [0.38, -0.45], [-0.38, 0.25], [0.38, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.15, z]}>
          <boxGeometry args={[0.06, 0.9, 0.06]} />
          <meshStandardMaterial color="#1d2433" />
        </mesh>
      ))}
      <mesh position={[0, 1.62, -0.1]}>
        <boxGeometry args={[0.86, 0.06, 0.82]} />
        <meshStandardMaterial color="#1d2433" />
      </mesh>
      {/* seat */}
      <mesh position={[0, 0.85, -0.25]}>
        <boxGeometry args={[0.45, 0.3, 0.35]} />
        <meshStandardMaterial color="#1d2433" />
      </mesh>
      {/* mast */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 1.0, 0.62]}>
          <boxGeometry args={[0.08, 1.8, 0.08]} />
          <meshStandardMaterial color="#3b4458" />
        </mesh>
      ))}
      {/* forks */}
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, carrying ? 0.45 : 0.12, 1.05]}>
          <boxGeometry args={[0.1, 0.05, 0.85]} />
          <meshStandardMaterial color="#3b4458" />
        </mesh>
      ))}
      {[[0.38, 0.3], [-0.38, 0.3], [0.38, -0.55], [-0.38, -0.55]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.14, 12]} />
          <meshStandardMaterial color={WHEEL} />
        </mesh>
      ))}
      {carrying && (
        <group position={[0, 0.42, 1.15]} scale={0.8}>
          <Pallet boxes={4} />
        </group>
      )}
    </group>
  );
}

export function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1.2, 8]} />
        <meshStandardMaterial color="#8a5a3c" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial color="#62c79a" roughness={0.9} />
      </mesh>
    </group>
  );
}
