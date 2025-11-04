import React from 'react';
import { Circle, Text, Group } from 'react-konva';

interface PlayerProps {
  x: number;
  y: number;
  role: string; // Il ruolo del giocatore (P, S1, C2, O, S2, C1)
  name?: string; // Il nome del giocatore (opzionale)
  color?: string;
  draggable?: boolean;
  scale?: number;
  onDragEnd?: (pos: { x: number; y: number }) => void;
  onClick?: () => void;
}

const Player: React.FC<PlayerProps> = ({
  x,
  y,
  role,
  name,
  color = '#3498db',
  draggable = true,
  scale = 1,
  onDragEnd,
  onClick,
}) => {
  const radius = Math.max(20, 35 * scale); // Cerchi più grandi
  const fontSize = Math.max(10, 14 * scale); // Font size leggermente più grande

  // Usa il nome se presente, altrimenti il ruolo
  const displayText = name && name.trim() !== '' ? name : role;

  // Per i nomi lunghi, riduci il font size per adattarsi al cerchio
  const adjustedFontSize = displayText.length > 4 ? fontSize * 0.85 : fontSize;

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e: any) =>
        onDragEnd && onDragEnd({ x: e.target.x(), y: e.target.y() })
      }
      onClick={onClick}
    >
      <Circle radius={radius} fill={color} />
      <Text
        text={displayText}
        fontSize={adjustedFontSize}
        fill='white'
        align='center'
        verticalAlign='middle'
        offsetX={radius}
        offsetY={radius}
        width={radius * 2}
        height={radius * 2}
        ellipsis={true}
        wrap='none'
      />
    </Group>
  );
};

export default Player;
