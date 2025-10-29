import React from 'react';
import { Circle, Text, Group } from 'react-konva';

interface PlayerProps {
  x: number;
  y: number;
  role: string; // Il ruolo del giocatore (P, S1, C2, O, S2, C1)
  color?: string;
  draggable?: boolean;
  scale?: number;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}

const Player: React.FC<PlayerProps> = ({
  x,
  y,
  role,
  color = '#3498db',
  draggable = true,
  scale = 1,
  onDragEnd,
}) => {
  const radius = Math.max(15, 25 * scale); // Raggio minimo per mobile
  const fontSize = Math.max(10, 16 * scale); // Font size minimo per mobile
  
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e: any) =>
        onDragEnd && onDragEnd({ x: e.target.x(), y: e.target.y() })
      }
    >
      <Circle radius={radius} fill={color} />
      <Text
        text={role}
        fontSize={fontSize}
        fill='white'
        align='center'
        verticalAlign='middle'
        offsetX={role.length > 1 ? fontSize * 0.6 : fontSize * 0.3}
        offsetY={fontSize * 0.6}
      />
    </Group>
  );
};

export default Player;
