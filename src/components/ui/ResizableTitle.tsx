import { Resizable } from 'react-resizable';

interface ResizableTitleProps {
  width: number;
  onResize: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  children: React.ReactNode;
}

const ResizableTitle: React.FC<ResizableTitleProps> = ({ width, onResize, children }) => {
  if (!width) return <th>{children}</th>;

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 1 }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th style={{ width, position: 'relative' }}>
        {children}
      </th>
    </Resizable>
  );
};