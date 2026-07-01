import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';

const PEEK_HEIGHT = 96;
const SHEET_MAX_RATIO = 0.9;

function getCollapseOffset() {
  const screenH = Dimensions.get('window').height;
  return Math.max(200, Math.round(screenH * SHEET_MAX_RATIO - PEEK_HEIGHT));
}

/** Drag down to collapse (peek), drag up to expand. Does not call onClose. */
export function useSheetSnap(visible) {
  const translateY = useRef(new Animated.Value(0)).current;
  const snapRef = useRef('expanded');
  const dragStartRef = useRef(0);
  const collapseOffsetRef = useRef(getCollapseOffset());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    collapseOffsetRef.current = getCollapseOffset();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      snapRef.current = 'expanded';
      setCollapsed(false);
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const snapTo = (target) => {
    const collapseOffset = collapseOffsetRef.current;
    const toValue = target === 'collapsed' ? collapseOffset : 0;
    snapRef.current = target;
    setCollapsed(target === 'collapsed');
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      damping: 24,
      stiffness: 220,
    }).start();
  };

  const toggleSnap = () => {
    snapTo(snapRef.current === 'expanded' ? 'collapsed' : 'expanded');
  };

  const collapse = () => snapTo('collapsed');
  const expand = () => snapTo('expanded');

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          dragStartRef.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const collapseOffset = collapseOffsetRef.current;
        const next = Math.max(0, Math.min(collapseOffset, dragStartRef.current + gesture.dy));
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const collapseOffset = collapseOffsetRef.current;
        const current = Math.max(
          0,
          Math.min(collapseOffset, dragStartRef.current + gesture.dy)
        );
        const mid = collapseOffset / 2;

        if (gesture.vy > 0.6 || current > mid) {
          snapTo('collapsed');
        } else if (gesture.vy < -0.6 || current < mid) {
          snapTo('expanded');
        } else {
          snapTo(current >= mid ? 'collapsed' : 'expanded');
        }
      },
    })
  ).current;

  return {
    translateY,
    panHandlers: panResponder.panHandlers,
    toggleSnap,
    collapse,
    expand,
    collapsed,
  };
}

/** Legacy: drag down dismisses (ActionSheet 등). */
export function useSheetDrag(visible, onClose) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 72 || gesture.vy > 0.85) {
          Animated.timing(translateY, {
            toValue: 480,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 220,
          }).start();
        }
      },
    })
  ).current;

  return { translateY, panHandlers: panResponder.panHandlers };
}
