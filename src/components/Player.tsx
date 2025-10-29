import React from 'react';
import { Circle, Text, Group } from 'react-konva';

interface PlayerProps {
  x: number;
  y: number;
  role: string; // Il ruolo del giocatore (P, S1, C2, O, S2, C1)
  color?: string;
  draggable?: boolean;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}

const Player: React.FC<PlayerProps> = ({
  x,
  y,
  role,
  color = '#3498db',
  draggable = true,
  onDragEnd,
}) => {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e: any) =>
        onDragEnd && onDragEnd({ x: e.target.x(), y: e.target.y() })
      }
    >
      <Circle radius={25} fill={color} />
      <Text
        text={role}
        fontSize={16}
        fill='white'
        align='center'
        verticalAlign='middle'
        offsetX={role.length > 1 ? 10 : 5}
        offsetY={10}
      />
    </Group>
  );
};

export default Player;
