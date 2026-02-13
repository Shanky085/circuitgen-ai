import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Search, Zap, List, Cpu, Settings, RefreshCw, MessageSquare, Loader2, Wand2, BookOpen } from 'lucide-react';

// --- API CONFIGURATION ---
const apiKey = process.env.REACT_APP_GEMINI_API_KEY; 

// --- CONFIGURATION ---
const CELL = 15;
const OFF_X = 140; 
const OFF_Y = 30;

const COLORS = {
  BG: '#121212',
  BOARD_BODY: '#e5e7eb',
  BOARD_GROOVE: '#d1d5db',
  PIN_HOLE: '#9ca3af',
  VCC_RAIL: '#f87171',
  GND_RAIL: '#60a5fa',
  IC_BODY: '#1f2937',
  IC_TEXT: '#f3f4f6',
  WIRE_RED: '#ef4444',
  WIRE_BLACK: '#111827',
  WIRE_BLUE: '#3b82f6',
  WIRE_ORANGE: '#f97316',
  WIRE_GREEN: '#22c55e',
  WIRE_PURPLE: '#a855f7',
  WIRE_YELLOW: '#eab308',
  LED_ON: '#ef4444',
  LED_OFF: '#450a0a'
};

// --- HELPER TO GENERATE WIRES FOR VCC/GND ---
const powerWires = (chipIdx, pins = 14) => {
  if (pins === 14) {
    return [
      { s: 'VCC', e: {c: chipIdx, p: 14}, color: 'WIRE_RED' },
      { s: 'GND', e: {c: chipIdx, p: 7}, color: 'WIRE_BLACK' }
    ];
  } else if (pins === 16) {
    return [
      { s: 'VCC', e: {c: chipIdx, p: 16}, color: 'WIRE_RED' },
      { s: 'GND', e: {c: chipIdx, p: 8}, color: 'WIRE_BLACK' }
    ];
  } else if (pins === '7476') { // Weird 7476 pinout
    return [
      { s: 'VCC', e: {c: chipIdx, p: 5}, color: 'WIRE_RED' },
      { s: 'GND', e: {c: chipIdx, p: 13}, color: 'WIRE_BLACK' }
    ];
  }
  return [];
};

// --- COMPREHENSIVE RECIPE LIBRARY ---
const RECIPES = {
  // --- 1. BASIC GATES ---
  'basic_gates': {
    title: 'Basic Logic Gates',
    desc: 'Verify Truth Tables for AND, OR, NOT, NAND, NOR, XOR.',
    explanation: 'Demonstrates basic 7400-series logic gates. \n\n- AND (7408): Output High only if both inputs High. \n- OR (7432): Output High if at least one input High.',
    bom: ['1x 7408 (AND)', '1x 7432 (OR)', 'Switches & LEDs'],
    chips: [{id: 'u1', type: '7408', x: 20}, {id: 'u2', type: '7432', x: 35}],
    inputs: ['A', 'B'], outputs: ['AND', 'OR'],
    wires: [
      ...powerWires(0), ...powerWires(1),
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: 'LED_0', color: 'WIRE_GREEN' },
      { s: 'SW_0', e: {c:1, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:1, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:1, p:3}, e: 'LED_1', color: 'WIRE_GREEN' },
    ],
    logic: (i) => [i[0]&i[1], i[0]|i[1]]
  },

  // --- 2. UNIVERSAL NAND IMPLEMENTATIONS ---
  'not_using_nand': {
    title: 'NOT using NAND',
    desc: 'Universal Gate: Inverter created by tying NAND inputs together.',
    explanation: 'A NAND gate can act as a NOT gate (Inverter) if you connect both of its inputs together. \n\nWhen Input A is 0, NAND(0,0) = 1. \nWhen Input A is 1, NAND(1,1) = 0.',
    bom: ['1x 7400 (NAND)'],
    chips: [{id: 'u1', type: '7400', x: 25}],
    inputs: ['A'], outputs: ['Y'],
    wires: [
      ...powerWires(0),
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' },
      { s: {c:0, p:3}, e: 'LED_0', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [!i[0]]
  },
  'and_using_nand': {
    title: 'AND using NAND',
    desc: 'Universal Gate: NAND followed by NOT (NAND as inverter).',
    explanation: 'An AND gate is just a NAND gate followed by an Inverter. \n\nHere, the first NAND gate produces (A NAND B). The second NAND gate (wired as an inverter) flips that output to give (A AND B).',
    bom: ['1x 7400 (NAND)'],
    chips: [{id: 'u1', type: '7400', x: 25}],
    inputs: ['A', 'B'], outputs: ['Y'],
    wires: [
      ...powerWires(0),
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: {c:0, p:4}, color: 'WIRE_PURPLE' }, { s: {c:0, p:3}, e: {c:0, p:5}, color: 'WIRE_PURPLE' },
      { s: {c:0, p:6}, e: 'LED_0', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [!!(i[0]&i[1])]
  },
  'or_using_nand': {
    title: 'OR using NAND',
    desc: 'Universal Gate: Invert A, Invert B, then NAND them.',
    explanation: 'To make an OR gate from NANDs, we use De Morgan\'s Law: A OR B = (NOT A) NAND (NOT B). \n\nWe use two NAND gates to invert inputs A and B separately, then feed those inverted signals into a third NAND gate.',
    bom: ['1x 7400 (NAND)'],
    chips: [{id: 'u1', type: '7400', x: 25}],
    inputs: ['A', 'B'], outputs: ['Y'],
    wires: [
      ...powerWires(0),
      // Invert A (Gate 1)
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' },
      // Invert B (Gate 2)
      { s: 'SW_1', e: {c:0, p:4}, color: 'WIRE_ORANGE' }, { s: 'SW_1', e: {c:0, p:5}, color: 'WIRE_ORANGE' },
      // NAND outputs (Gate 3)
      { s: {c:0, p:3}, e: {c:0, p:9}, color: 'WIRE_PURPLE' }, { s: {c:0, p:6}, e: {c:0, p:10}, color: 'WIRE_PURPLE' },
      { s: {c:0, p:8}, e: 'LED_0', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [i[0]|i[1]]
  },

  // --- 3. UNIVERSAL NOR IMPLEMENTATIONS ---
  'not_using_nor': {
    title: 'NOT using NOR',
    desc: 'Universal Gate: Inverter created by tying NOR inputs together.',
    explanation: 'A NOR gate acts as a NOT gate if its inputs are tied together. NOR(A,A) = NOT(A).',
    bom: ['1x 7402 (NOR)'],
    chips: [{id: 'u1', type: '7402', x: 25}],
    inputs: ['A'], outputs: ['Y'],
    wires: [
      ...powerWires(0),
      { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' }, { s: 'SW_0', e: {c:0, p:3}, color: 'WIRE_BLUE' },
      { s: {c:0, p:1}, e: 'LED_0', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [!i[0]]
  },
  'or_using_nor': {
    title: 'OR using NOR',
    desc: 'Universal Gate: NOR followed by NOT (NOR as inverter).',
    explanation: 'An OR gate is just a NOR gate followed by an Inverter. \n\nThe first gate produces (A NOR B). The second gate inverts it to get (A OR B).',
    bom: ['1x 7402 (NOR)'],
    chips: [{id: 'u1', type: '7402', x: 25}],
    inputs: ['A', 'B'], outputs: ['Y'],
    wires: [
      ...powerWires(0),
      { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:3}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:1}, e: {c:0, p:5}, color: 'WIRE_PURPLE' }, { s: {c:0, p:1}, e: {c:0, p:6}, color: 'WIRE_PURPLE' },
      { s: {c:0, p:4}, e: 'LED_0', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [i[0]|i[1]]
  },
  'and_using_nor': {
    title: 'AND using NOR',
    desc: 'Universal Gate: Invert A, Invert B, then NOR them.',
    explanation: 'To make an AND gate from NORs, we use De Morgan\'s Law: A AND B = (NOT A) NOR (NOT B). \n\nWe invert both inputs using NOR gates, then feed them into a final NOR gate.',
    bom: ['1x 7402 (NOR)'],
    chips: [{id: 'u1', type: '7402', x: 25}],
    inputs: ['A', 'B'], outputs: ['Y'],
    wires: [
      ...powerWires(0),
      // Invert A (Gate 1: In 2,3 -> Out 1)
      { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' }, { s: 'SW_0', e: {c:0, p:3}, color: 'WIRE_BLUE' },
      // Invert B (Gate 2: In 5,6 -> Out 4)
      { s: 'SW_1', e: {c:0, p:5}, color: 'WIRE_ORANGE' }, { s: 'SW_1', e: {c:0, p:6}, color: 'WIRE_ORANGE' },
      // NOR outputs (Gate 3: In 8,9 -> Out 10)
      { s: {c:0, p:1}, e: {c:0, p:8}, color: 'WIRE_PURPLE' }, { s: {c:0, p:4}, e: {c:0, p:9}, color: 'WIRE_PURPLE' },
      { s: {c:0, p:10}, e: 'LED_0', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [i[0]&i[1]]
  },

  // --- 4. ARITHMETIC ---
  'half_adder': {
    title: 'Half Adder',
    desc: 'Adds 2 bits. Sum = A^B, Carry = A.B',
    explanation: 'A Half Adder adds two binary digits. \n\n- Sum is calculated using an XOR gate (A ^ B). \n- Carry is calculated using an AND gate (A & B).',
    bom: ['1x 7486 (XOR)', '1x 7408 (AND)'],
    chips: [{id: 'u1', type: '7486', x: 20}, {id: 'u2', type: '7408', x: 35}],
    inputs: ['A', 'B'], outputs: ['Sum', 'Cout'],
    wires: [
      ...powerWires(0), ...powerWires(1),
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: 'LED_0', color: 'WIRE_GREEN' },
      { s: 'SW_0', e: {c:1, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:1, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:1, p:3}, e: 'LED_1', color: 'WIRE_YELLOW' }
    ],
    logic: (i) => [i[0]^i[1], i[0]&i[1]]
  },
  'full_adder': {
    title: 'Full Adder',
    desc: 'Adds A, B, Cin.',
    explanation: 'A Full Adder adds three bits (A, B, Carry-In). \n\nIt effectively uses two Half Adders. \n- Sum = A XOR B XOR Cin. \n- Carry Out = (A AND B) OR (Cin AND (A XOR B)).',
    bom: ['1x 7486, 1x 7408, 1x 7432'],
    chips: [{id:'u1',type:'7486',x:15}, {id:'u2',type:'7408',x:28}, {id:'u3',type:'7432',x:41}],
    inputs: ['A', 'B', 'Cin'], outputs: ['Sum', 'Cout'],
    wires: [
      ...powerWires(0), ...powerWires(1), ...powerWires(2),
      // Sum = A^B^C
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: {c:0, p:4}, color: 'WIRE_PURPLE' }, { s: 'SW_2', e: {c:0, p:5}, color: 'WIRE_YELLOW' },
      { s: {c:0, p:6}, e: 'LED_0', color: 'WIRE_GREEN' },
      // Carry
      { s: 'SW_0', e: {c:1, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:1, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: {c:1, p:4}, color: 'WIRE_PURPLE' }, { s: 'SW_2', e: {c:1, p:5}, color: 'WIRE_YELLOW' },
      { s: {c:1, p:3}, e: {c:2, p:1}, color: 'WIRE_PURPLE' }, { s: {c:1, p:6}, e: {c:2, p:2}, color: 'WIRE_PURPLE' },
      { s: {c:2, p:3}, e: 'LED_1', color: 'WIRE_RED' }
    ],
    logic: (i) => [i[0]^i[1]^i[2], (i[0]&i[1])|(i[2]&(i[0]^i[1]))]
  },
  'half_subtractor': {
    title: 'Half Subtractor',
    desc: 'Diff = A^B, Borrow = (!A).B',
    explanation: 'Subtracts B from A (A-B). \n\n- Difference = A XOR B. \n- Borrow = (NOT A) AND B. (We need to borrow if A=0 and B=1).',
    bom: ['1x 7486, 1x 7404, 1x 7408'],
    chips: [{id:'u1',type:'7486',x:15}, {id:'u2',type:'7404',x:28}, {id:'u3',type:'7408',x:41}],
    inputs: ['A', 'B'], outputs: ['Diff', 'Borr'],
    wires: [
      ...powerWires(0), ...powerWires(1), ...powerWires(2),
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: 'LED_0', color: 'WIRE_GREEN' },
      { s: 'SW_0', e: {c:1, p:1}, color: 'WIRE_BLUE' }, { s: {c:1, p:2}, e: {c:2, p:1}, color: 'WIRE_PURPLE' },
      { s: 'SW_1', e: {c:2, p:2}, color: 'WIRE_ORANGE' }, { s: {c:2, p:3}, e: 'LED_1', color: 'WIRE_RED' }
    ],
    logic: (i) => [i[0]^i[1], (!i[0])&i[1]]
  },
  'full_subtractor': {
    title: 'Full Subtractor',
    desc: 'Subtracts A - B - Bin. Outputs Diff & Bout.',
    explanation: 'Subtracts three bits: A - B - BorrowIn. \n\n- Difference = A XOR B XOR Bin. \n- Borrow Out logic handles cases where we need to borrow from the next stage.',
    bom: ['1x 7486 (XOR)', '1x 7408 (AND)', '1x 7404 (NOT)', '1x 7432 (OR)'],
    chips: [{id: 'u1', type: '7486', x: 10}, {id: 'u2', type: '7408', x: 22}, {id: 'u3', type: '7404', x: 34}, {id: 'u4', type: '7432', x: 46}],
    inputs: ['A', 'B', 'Bin'], outputs: ['Diff', 'Bout'],
    wires: [
      ...powerWires(0), ...powerWires(1), ...powerWires(2), ...powerWires(3),
      // Diff = A^B^Bin
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: {c:0, p:4}, color: 'WIRE_PURPLE' }, { s: 'SW_2', e: {c:0, p:5}, color: 'WIRE_GREEN' },
      { s: {c:0, p:6}, e: 'LED_0', color: 'WIRE_GREEN' },
      // Bout logic (simplified)
      { s: {c:2, p:2}, e: {c:1, p:1}, color: 'WIRE_YELLOW' }, // NOT A -> AND
      { s: {c:1, p:3}, e: {c:3, p:1}, color: 'WIRE_YELLOW' }, // AND -> OR
      { s: {c:3, p:3}, e: 'LED_1', color: 'WIRE_RED' },
    ],
    logic: (i) => {
       const diff = i[0]^i[1]^i[2];
       const bout = ((!i[0])&i[1]) | ((!(i[0]^i[1]))&i[2]);
       return [diff, bout];
    }
  },
  'multiplier_2bit': {
    title: '2-Bit Multiplier',
    desc: 'Multiplies two 2-bit numbers (A1A0 * B1B0).',
    explanation: 'Multiplies two 2-bit numbers. \n\nUses AND gates to create partial products (like digit multiplication) and Half Adders to sum them up. Output is 4 bits (P3 P2 P1 P0).',
    bom: ['2x 7408 (AND)', '1x 7486 (XOR)', '4x LEDs'],
    chips: [{id: 'u1', type: '7408', x: 15}, {id: 'u2', type: '7486', x: 28}, {id: 'u3', type: '7408', x: 41}],
    inputs: ['A0', 'A1', 'B0', 'B1'], outputs: ['P0', 'P1', 'P2', 'P3'],
    wires: [
      ...powerWires(0), ...powerWires(1), ...powerWires(2),
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_2', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: 'LED_0', color: 'WIRE_GREEN' },
      { s: 'SW_1', e: {c:0, p:4}, color: 'WIRE_PURPLE' }, { s: 'SW_2', e: {c:0, p:5}, color: 'WIRE_ORANGE' }, 
      { s: 'SW_0', e: {c:0, p:9}, color: 'WIRE_BLUE' }, { s: 'SW_3', e: {c:0, p:10}, color: 'WIRE_YELLOW' },
      { s: {c:0, p:6}, e: {c:1, p:1}, color: 'WIRE_PURPLE' }, { s: {c:0, p:8}, e: {c:1, p:2}, color: 'WIRE_PURPLE' },
      { s: {c:1, p:3}, e: 'LED_1', color: 'WIRE_GREEN' },
      { s: {c:2, p:6}, e: 'LED_3', color: 'WIRE_RED' },
    ],
    logic: (i) => {
       const a = i[0] + (i[1]*2);
       const b = i[2] + (i[3]*2);
       const p = a * b;
       return [p&1, (p>>1)&1, (p>>2)&1, (p>>3)&1];
    }
  },

  // --- 5. CONVERTERS ---
  'binary_gray': {
    title: 'Binary to Gray Code',
    desc: '4-bit Binary to Gray using XOR (7486).',
    explanation: 'Converts Binary to Gray code. \n\nGray code ensures only one bit changes at a time. \nLogic: G[i] = B[i] XOR B[i+1]. MSB stays the same.',
    bom: ['1x 7486 (XOR)'],
    chips: [{id:'u1',type:'7486',x:25}],
    inputs: ['B3','B2','B1','B0'], outputs: ['G3','G2','G1','G0'],
    wires: [
      ...powerWires(0),
      { s: 'SW_0', e: 'LED_0', color: 'WIRE_BLUE' }, // G3=B3
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' },
      { s: {c:0, p:3}, e: 'LED_1', color: 'WIRE_GREEN' },
      { s: 'SW_1', e: {c:0, p:4}, color: 'WIRE_ORANGE' }, { s: 'SW_2', e: {c:0, p:5}, color: 'WIRE_YELLOW' },
      { s: {c:0, p:6}, e: 'LED_2', color: 'WIRE_GREEN' },
      { s: 'SW_2', e: {c:0, p:9}, color: 'WIRE_YELLOW' }, { s: 'SW_3', e: {c:0, p:10}, color: 'WIRE_PURPLE' },
      { s: {c:0, p:8}, e: 'LED_3', color: 'WIRE_GREEN' }
    ],
    logic: (i) => [i[0], i[0]^i[1], i[1]^i[2], i[2]^i[3]]
  },

  // --- 6. MULTIPLEXER (74153) ---
  'mux_74153': {
    title: '4:1 Multiplexer (74153)',
    desc: 'Dual 4-Input Mux. Selected by A, B.',
    explanation: 'A 4:1 Multiplexer selects one of 4 data inputs (C0-C3) based on the Select lines (A, B) and sends it to the Output Y. \n\nLike a digital switch controlled by A and B.',
    bom: ['1x 74153 (Dual 4:1 Mux)'],
    chips: [{id:'u1', type:'74153', x:25}], // 16-pin
    inputs: ['A', 'B', '1C0', '1C1', '1C2', '1C3'], outputs: ['1Y'],
    wires: [
      ...powerWires(0, 16), // 16 pin power
      { s: 'GND', e: {c:0, p:1}, color: 'WIRE_BLACK' }, // 1G (Enable) grounded (Active Low)
      { s: 'SW_0', e: {c:0, p:14}, color: 'WIRE_BLUE' }, // Select A
      { s: 'SW_1', e: {c:0, p:2}, color: 'WIRE_ORANGE' }, // Select B
      // Inputs
      { s: 'SW_2', e: {c:0, p:6}, color: 'WIRE_GREEN' }, // 1C0
      { s: 'SW_3', e: {c:0, p:5}, color: 'WIRE_GREEN' }, // 1C1
      { s: 'SW_4', e: {c:0, p:4}, color: 'WIRE_GREEN' }, // 1C2
      { s: 'SW_5', e: {c:0, p:3}, color: 'WIRE_GREEN' }, // 1C3
      // Output
      { s: {c:0, p:7}, e: 'LED_0', color: 'WIRE_RED' }
    ],
    logic: (i) => {
      const sel = i[1]*2 + i[0]; // B is MSB
      if(sel === 0) return [i[2]];
      if(sel === 1) return [i[3]];
      if(sel === 2) return [i[4]];
      if(sel === 3) return [i[5]];
      return [0];
    }
  },

  // --- 7. DECODER (74139) ---
  'decoder_74139': {
    title: '2-to-4 Decoder (74139)',
    desc: 'Dual 2-to-4 Line Decoder (Active Low Outputs).',
    explanation: 'Decodes a 2-bit input (A, B) to activate one of 4 output lines. \n\nNote: The 74139 has ACTIVE LOW outputs, meaning the selected output goes to 0V (LED Off or Inverted), while others stay High.',
    bom: ['1x 74139 (Dual Decoder)'],
    chips: [{id:'u1', type:'74139', x:25}], // 16-pin
    inputs: ['A', 'B', 'En'], outputs: ['Y0', 'Y1', 'Y2', 'Y3'],
    wires: [
      ...powerWires(0, 16),
      { s: 'SW_2', e: {c:0, p:1}, color: 'WIRE_BLACK' }, // Enable (1G)
      { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' }, // A (Select 0)
      { s: 'SW_1', e: {c:0, p:3}, color: 'WIRE_ORANGE' }, // B (Select 1)
      // Outputs (Active Low)
      { s: {c:0, p:4}, e: 'LED_0', color: 'WIRE_RED' },
      { s: {c:0, p:5}, e: 'LED_1', color: 'WIRE_RED' },
      { s: {c:0, p:6}, e: 'LED_2', color: 'WIRE_RED' },
      { s: {c:0, p:7}, e: 'LED_3', color: 'WIRE_RED' }
    ],
    logic: (i) => {
      // 74139 is Active Low outputs. Enable is Active Low.
      if (i[2]) return [1,1,1,1]; // Disabled (High) -> All High
      const sel = i[1]*2 + i[0];
      const out = [1,1,1,1];
      out[sel] = 0; // Active Low
      return out.map(v => !v); // Invert for LED visualization (Light ON = Selected)
    }
  },

  // --- 8. COMPARATOR (7485) ---
  'comparator_7485': {
    title: '4-Bit Magnitude Comparator',
    desc: 'Compares Word A (A3..A0) and B (B3..B0).',
    explanation: 'Compares two binary numbers (A and B). \n\nOutputs signals for: \n- A > B \n- A = B \n- A < B',
    bom: ['1x 7485 (4-bit Comparator)'],
    chips: [{id:'u1', type:'7485', x:25}], // 16-pin
    inputs: ['A1', 'A0', 'B1', 'B0'], 
    outputs: ['A>B', 'A=B', 'A<B'],
    wires: [
      ...powerWires(0, 16),
      // Tie unused inputs (A3,A2,B3,B2) to Ground
      { s: 'GND', e: {c:0, p:15}, color: 'WIRE_BLACK' }, { s: 'GND', e: {c:0, p:13}, color: 'WIRE_BLACK' },
      { s: 'GND', e: {c:0, p:1}, color: 'WIRE_BLACK' }, { s: 'GND', e: {c:0, p:14}, color: 'WIRE_BLACK' },
      // Cascading inputs: A=B(3) High, others Low
      { s: 'VCC', e: {c:0, p:3}, color: 'WIRE_RED' }, 
      { s: 'GND', e: {c:0, p:2}, color: 'WIRE_BLACK' }, { s: 'GND', e: {c:0, p:4}, color: 'WIRE_BLACK' },
      // Inputs A1(12), A0(10), B1(11), B0(9)
      { s: 'SW_0', e: {c:0, p:12}, color: 'WIRE_BLUE' }, { s: 'SW_1', e: {c:0, p:10}, color: 'WIRE_BLUE' },
      { s: 'SW_2', e: {c:0, p:11}, color: 'WIRE_ORANGE' }, { s: 'SW_3', e: {c:0, p:9}, color: 'WIRE_ORANGE' },
      // Outputs
      { s: {c:0, p:5}, e: 'LED_0', color: 'WIRE_GREEN' }, // A>B
      { s: {c:0, p:6}, e: 'LED_1', color: 'WIRE_YELLOW' }, // A=B
      { s: {c:0, p:7}, e: 'LED_2', color: 'WIRE_RED' }  // A<B
    ],
    logic: (i) => {
      const a = i[0]*2 + i[1];
      const b = i[2]*2 + i[3];
      return [a>b, a===b, a<b];
    }
  },

  // --- 9. FLIP FLOPS ---
  'd_ff_7474': {
    title: 'D Flip-Flop (7474)',
    desc: 'Rising Edge Triggered. 1:/CLR, 2:D, 3:CLK, 4:/PRE',
    explanation: 'A D Flip-Flop stores 1 bit of data. \n\nWhen the Clock rises, the value of D is captured and stored at Q. \nPreset and Clear pins allow forcing the state.',
    bom: ['1x 7474 (Dual D-FF)'],
    chips: [{id:'u1', type:'7474', x:25}],
    inputs: ['D', 'CLK', 'PRE', 'CLR'], outputs: ['Q', '/Q'],
    wires: [
      ...powerWires(0, 14),
      { s: 'SW_2', e: {c:0, p:4}, color: 'WIRE_RED' }, // PRE (Active Low, default High)
      { s: 'SW_3', e: {c:0, p:1}, color: 'WIRE_RED' }, // CLR (Active Low)
      { s: 'SW_0', e: {c:0, p:2}, color: 'WIRE_BLUE' }, // D
      { s: 'SW_1', e: {c:0, p:3}, color: 'WIRE_YELLOW' }, // CLK
      { s: {c:0, p:5}, e: 'LED_0', color: 'WIRE_GREEN' },
      { s: {c:0, p:6}, e: 'LED_1', color: 'WIRE_ORANGE' }
    ],
    logic: (i) => {
      if(!i[3]) return [0,1];
      if(!i[2]) return [1,0];
      return [i[0], !i[0]]; 
    }
  },
  'jk_ff_7476': {
    title: 'JK Flip-Flop (7476)',
    desc: 'Dual JK FF. Pin 5=VCC, 13=GND. 1K=16, 1J=4.',
    explanation: 'JK Flip-Flop functionality: \n- J=0, K=0: No Change \n- J=1, K=0: Set High \n- J=0, K=1: Reset Low \n- J=1, K=1: Toggle (Flip) state.',
    bom: ['1x 7476 (Dual JK)'],
    chips: [{id:'u1', type:'7476', x:25}], // 16-pin
    inputs: ['J', 'K', 'CLK'], outputs: ['Q', '/Q'],
    wires: [
      ...powerWires(0, '7476'), // Custom power
      { s: 'SW_0', e: {c:0, p:4}, color: 'WIRE_BLUE' }, // 1J
      { s: 'SW_1', e: {c:0, p:16}, color: 'WIRE_ORANGE' }, // 1K
      { s: 'SW_2', e: {c:0, p:1}, color: 'WIRE_YELLOW' }, // 1CLK
      { s: 'VCC', e: {c:0, p:2}, color: 'WIRE_RED' }, // PRE
      { s: 'VCC', e: {c:0, p:3}, color: 'WIRE_RED' }, // CLR
      { s: {c:0, p:15}, e: 'LED_0', color: 'WIRE_GREEN' }, // 1Q
      { s: {c:0, p:14}, e: 'LED_1', color: 'WIRE_RED' }  // 1/Q
    ],
    logic: (i) => {
      const j=i[0], k=i[1];
      if(j && !k) return [1,0];
      if(!j && k) return [0,1];
      if(j && k) return [1,1]; 
      return [0,1]; 
    }
  },

  // --- 10. COUNTER ---
  'counter_mod4': {
    title: 'Mod-4 Asynchronous Counter',
    desc: '2-bit Up Counter using JK FFs (7476). J=K=1 (Toggle).',
    explanation: 'A 2-bit counter counts 00 -> 01 -> 10 -> 11. \n\nCreated by cascading two JK Flip-Flops in "Toggle Mode" (J=1, K=1). The output of the first FF acts as the clock for the second.',
    bom: ['1x 7476 (Dual JK)'],
    chips: [{id:'u1', type:'7476', x:25}],
    inputs: ['CLK'], outputs: ['Q0', 'Q1'],
    wires: [
      ...powerWires(0, '7476'),
      // Set all J, K, PRE, CLR to High
      { s: 'VCC', e: {c:0, p:4}, color: 'WIRE_RED' }, { s: 'VCC', e: {c:0, p:16}, color: 'WIRE_RED' }, // FF1 JK
      { s: 'VCC', e: {c:0, p:9}, color: 'WIRE_RED' }, { s: 'VCC', e: {c:0, p:12}, color: 'WIRE_RED' }, // FF2 JK
      { s: 'VCC', e: {c:0, p:2}, color: 'WIRE_RED' }, { s: 'VCC', e: {c:0, p:3}, color: 'WIRE_RED' }, // FF1 Pre/Clr
      { s: 'VCC', e: {c:0, p:7}, color: 'WIRE_RED' }, { s: 'VCC', e: {c:0, p:8}, color: 'WIRE_RED' }, // FF2 Pre/Clr
      // Clock 1
      { s: 'SW_0', e: {c:0, p:1}, color: 'WIRE_YELLOW' },
      // Output 1 -> Clock 2
      { s: {c:0, p:15}, e: {c:0, p:6}, color: 'WIRE_PURPLE' },
      // LEDs
      { s: {c:0, p:15}, e: 'LED_0', color: 'WIRE_GREEN' }, // Q0
      { s: {c:0, p:11}, e: 'LED_1', color: 'WIRE_GREEN' }  // Q1
    ],
    logic: (i) => {
      // Hard to sim state here, just show static
      return [i[0], !i[0]];
    }
  }
};

// --- API & GENERATION LOGIC ---
const SYSTEM_PROMPT_GENERATOR = `Generate JSON circuit. Chips: 7400,7402,7404,7408,7432,7486. Format: {title, desc, explanation, bom:[], chips:[{id,type,x}], inputs:[], outputs:[], wires:[{s,e,color}], logicFuncString}`;
const SYSTEM_PROMPT_EXPLAINER = `Explain digital logic circuit provided in JSON. Short, educational.`;

async function generateCircuitAI(prompt) {
  if (!apiKey) { alert("Please set API Key in .env"); return null; }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ contents: [{parts:[{text:prompt}]}], systemInstruction: {parts:[{text:SYSTEM_PROMPT_GENERATOR}]}, generationConfig: {responseMimeType: "application/json"} })
    });
    const data = await res.json();
    const circuit = JSON.parse(data.candidates[0].content.parts[0].text);
    // eslint-disable-next-line no-new-func
    try { circuit.logic = new Function('return ' + circuit.logicFuncString)(); } catch { circuit.logic = () => [0]; }
    return circuit;
  } catch (e) { console.error(e); return null; }
}

async function explainCircuitAI(circuit) {
  if (!apiKey) return "Please set API Key.";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ contents: [{parts:[{text:`Explain: ${JSON.stringify({title:circuit.title, chips:circuit.chips, desc:circuit.desc})}`}]}], systemInstruction: {parts:[{text:SYSTEM_PROMPT_EXPLAINER}]} })
    });
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  } catch { return "Error explaining."; }
}

// --- RENDER HELPERS ---
const getCoords = (type, val, chips) => {
  const def = { x:0, y:0 };
  try {
    if (type === 'RAIL_VCC') return { x: OFF_X + 10, y: OFF_Y + CELL * 1.5 };
    if (type === 'RAIL_GND') return { x: OFF_X + 10, y: OFF_Y + CELL * 17.5 };
    if (type === 'SW') return { x: OFF_X + (20 + (parseInt(val.split('_')[1])||0) * 2) * CELL, y: OFF_Y + 16 * CELL };
    if (type === 'LED') return { x: OFF_X + (55 * CELL), y: OFF_Y + (4 + (parseInt(val.split('_')[1])||0) * 3) * CELL };
    if (type === 'PIN') {
      const chip = chips[val.c || 0];
      const pin = val.p || 1;
      const chipX = OFF_X + (chip.x * CELL);
      const chipY = OFF_Y + 6 * CELL;
      
      // Standard 14/16 pin logic
      // Bottom row (1-7 or 1-8)
      const maxBottom = (chip.type === '7476' || chip.type === '74153' || chip.type === '74139' || chip.type === '7485') ? 8 : 7;
      const maxTop = maxBottom * 2; // 16 or 14

      if (pin <= maxBottom) return { x: chipX + (pin - 1) * CELL + 5, y: chipY + 4.5 * CELL };
      else return { x: chipX + (maxTop - pin) * CELL + 5, y: chipY - 0.5 * CELL };
    }
  } catch { return def; }
  return def;
};

const Wire = ({ p1, p2, color }) => {
  if (!p1 || !p2 || !p1.x || !p2.x) return null;
  const midY = (p1.y + p2.y) / 2;
  const jitter = (p1.x % 5);
  const d = `M ${p1.x} ${p1.y} L ${p1.x} ${midY+jitter} L ${p2.x} ${midY+jitter} L ${p2.x} ${p2.y}`;
  return (
    <g>
      <path d={d} stroke={color} strokeWidth="3" fill="none" opacity="0.9" strokeLinejoin="round" />
      <circle cx={p1.x} cy={p1.y} r={2.5} fill={color} /><circle cx={p2.x} cy={p2.y} r={2.5} fill={color} />
    </g>
  );
};

export default function CircuitDesignerPro() {
  const [activeRecipe, setActiveRecipe] = useState(RECIPES['basic_gates']);
  const [inputs, setInputs] = useState([0, 0, 0, 0, 0, 0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  // Auto-load explanation when recipe changes
  useEffect(() => {
    if (activeRecipe.explanation) setExplanation(activeRecipe.explanation);
    else setExplanation('');
  }, [activeRecipe]);

  const outputs = useMemo(() => {
    try { return activeRecipe.logic ? activeRecipe.logic(inputs) : [0,0,0,0]; } catch { return [0,0,0,0]; }
  }, [inputs, activeRecipe]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    setLoading(true); setExplanation('');

    let key = null;
    // Map search terms to keys
    if (q.includes('mux') || q.includes('153')) key = 'mux_74153';
    else if (q.includes('decod') || q.includes('139')) key = 'decoder_74139';
    else if (q.includes('compar') || q.includes('7485')) key = 'comparator_7485';
    else if (q.includes('jk') || q.includes('7476')) key = 'jk_ff_7476';
    else if (q.includes('d flip') || q.includes('7474')) key = 'd_ff_7474';
    else if (q.includes('counter')) key = 'counter_mod4';
    else if (q.includes('gray')) key = 'binary_gray';
    else if (q.includes('sub') && q.includes('full')) key = 'full_subtractor';
    else if (q.includes('sub') && q.includes('half')) key = 'half_subtractor';
    else if (q.includes('add') && q.includes('full')) key = 'full_adder';
    else if (q.includes('add') && q.includes('half')) key = 'half_adder';
    else if (q.includes('mul')) key = 'multiplier_2bit';
    else if (q.includes('nand') && q.includes('not')) key = 'not_using_nand';
    else if (q.includes('nand') && q.includes('and')) key = 'and_using_nand';
    else if (q.includes('nand') && q.includes('or')) key = 'or_using_nand';
    else if (q.includes('nor') && q.includes('not')) key = 'not_using_nor';
    else if (q.includes('nor') && q.includes('or')) key = 'or_using_nor';
    else if (q.includes('nor') && q.includes('and')) key = 'and_using_nor';
    else if (q.includes('gate') || q.includes('logic')) key = 'basic_gates';

    if (key && RECIPES[key]) {
      setActiveRecipe(RECIPES[key]);
      setInputs([0,0,0,0,0,0]);
    } else {
      const ai = await generateCircuitAI(q);
      if (ai) {
        setActiveRecipe(ai);
        if (ai.explanation) setExplanation(ai.explanation);
      }
      else alert("Circuit not found in library and AI could not generate it.");
    }
    setLoading(false);
  };

  const handleExplain = async () => {
    setExplaining(true);
    const text = await explainCircuitAI(activeRecipe);
    setExplanation(text);
    setExplaining(false);
  };

  return (
    <div className="flex flex-col h-screen text-gray-200 font-sans overflow-hidden" style={{ backgroundColor: COLORS.BG }}>
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex items-center gap-3">
          <Activity className="text-green-500" />
          <div><h1 className="text-lg font-bold">CircuitGen <span className="text-green-500">Ultimate</span></h1><p className="text-xs text-gray-500">Powered by Gemini</p></div>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <input type="text" placeholder="Type: 'JK Flip Flop', 'Mux', 'Full Adder'..." value={search} onChange={(e)=>setSearch(e.target.value)} className="bg-gray-800 border border-gray-700 rounded pl-3 pr-10 py-1.5 text-sm w-80 text-gray-200 focus:outline-none focus:border-green-500" />
            {loading && <Loader2 className="absolute right-3 top-1.5 animate-spin text-green-500" size={16} />}
          </div>
          <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-500 px-4 rounded text-white font-bold text-sm flex items-center gap-2">{loading ? '...' : <><Wand2 size={14}/> LOAD</>}</button>
        </form>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
          <div><h2 className="text-xl font-bold mb-1 text-white">{activeRecipe.title}</h2><p className="text-sm text-gray-400">{activeRecipe.desc}</p></div>
          
          <div className="bg-blue-950/20 p-4 rounded-lg border border-blue-800/50">
             <div className="flex items-center gap-2 mb-2 text-blue-300">
               <BookOpen size={16} />
               <span className="text-xs font-bold uppercase tracking-wider">How it Works</span>
             </div>
             {explanation ? (
               <div className="text-xs text-blue-100 leading-relaxed whitespace-pre-line animate-in fade-in">{explanation}</div>
             ) : (
               <button onClick={handleExplain} disabled={explaining} className="w-full py-2 bg-blue-900/50 hover:bg-blue-900 border border-blue-700 rounded text-blue-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                {explaining ? <Loader2 className="animate-spin" size={14}/> : <MessageSquare size={14}/>} {explaining ? 'Analyzing...' : 'Generate Explanation'}
               </button>
             )}
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
             <div className="flex items-center gap-2 mb-3 text-blue-400"><List size={16} /><span className="text-xs font-bold uppercase">BOM</span></div>
             <ul className="space-y-2">{activeRecipe.bom.map((item, i) => <li key={i} className="text-sm text-gray-300 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>{item}</li>)}</ul>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
             <div className="flex items-center gap-2 mb-3 text-green-400"><Zap size={16} /><span className="text-xs font-bold uppercase">Simulation</span></div>
             <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">{activeRecipe.inputs.map((lbl, i) => <button key={i} onClick={() => {const n=[...inputs];n[i]=n[i]?0:1;setInputs(n)}} className={`px-2 py-1 rounded text-xs font-mono font-bold border ${inputs[i]?'bg-green-900 border-green-600':'bg-gray-800 border-gray-600'}`}>{lbl}={inputs[i]}</button>)}</div>
                <div className="flex gap-2 flex-wrap">{activeRecipe.outputs.map((lbl, i) => <div key={i} className={`px-2 py-1 rounded text-xs font-mono font-bold border ${outputs[i]?'bg-red-900 border-red-600':'bg-gray-800 border-gray-600'}`}>{lbl}={outputs[i]}</div>)}</div>
             </div>
          </div>
        </div>

        <div className="flex-1 bg-black relative overflow-auto flex items-center justify-center">
           <div className="relative" style={{ width: 1200, height: 600 }}>
             <svg width="100%" height="100%" viewBox="0 0 1200 600">
                <g transform="translate(20, 100)">
                  <rect width="100" height="150" rx="6" fill="#e4e4e7" /><rect x="10" y="15" width="80" height="40" rx="2" fill="#27272a" />
                  <text x="50" y="40" textAnchor="middle" fill="#22c55e" fontFamily="monospace" fontSize="16" fontWeight="bold">5.0V</text>
                  <circle cx="30" cy="120" r="6" fill="#18181b" /><circle cx="70" cy="120" r="6" fill="#ef4444" />
                  <path d="M 70 120 C 100 120, 100 52, 150 52" stroke="#ef4444" strokeWidth="4" fill="none" /><path d="M 30 120 C 60 120, 60 300, 150 300" stroke="#1f2937" strokeWidth="4" fill="none" />
                </g>
                <g transform={`translate(${OFF_X}, ${OFF_Y})`}>
                   <rect width={63 * CELL} height={20 * CELL} rx="6" fill={COLORS.BOARD_BODY} />
                   <rect x="0" y={8.5 * CELL} width={63 * CELL} height={2 * CELL} fill={COLORS.BOARD_GROOVE} />
                   {Array.from({length: 20}).map((_, r) => Array.from({length: 63}).map((_, c) => {
                       if (r===8||r===9) return null;
                       let fill = COLORS.PIN_HOLE; if (r===1) fill=COLORS.VCC_RAIL; if (r===17) fill=COLORS.GND_RAIL;
                       return <circle key={`${r}-${c}`} cx={c*CELL+CELL/2} cy={r*CELL+CELL/2} r={2} fill={fill} />
                   }))}
                </g>
                {activeRecipe.chips.map(chip => {
                    const w = (chip.type==='7476'||chip.type==='74153'||chip.type==='74139'||chip.type==='7485') ? 8 : 7;
                    return (
                    <g key={chip.id} transform={`translate(${OFF_X + chip.x * CELL}, ${OFF_Y + 7 * CELL})`}>
                       <rect width={w * CELL} height={5 * CELL} rx="3" fill={COLORS.IC_BODY} />
                       <text x={(w/2) * CELL} y={2.5 * CELL + 4} textAnchor="middle" fill={COLORS.IC_TEXT} fontSize="10" fontFamily="monospace" fontWeight="bold">{chip.type}</text>
                       <circle cx={6} cy={2.5 * CELL} r={3} fill="#4b5563" />
                       {Array.from({length:w}).map((_, i) => <React.Fragment key={i}><rect x={i*CELL+4} y={-3} width={6} height={4} fill="#9ca3af" /><rect x={i*CELL+4} y={5*CELL-1} width={6} height={4} fill="#9ca3af" /></React.Fragment>)}
                    </g>
                )})}
                <g transform={`translate(${OFF_X + 22 * CELL}, ${OFF_Y + 16 * CELL})`}>
                   <rect x="-10" y="-10" width={activeRecipe.inputs.length * 20 + 20} height="55" fill="#1d4ed8" rx="4" />
                   {activeRecipe.inputs.map((lbl, i) => (
                     <g key={i} transform={`translate(${i * 20}, 0)`} onClick={() => { const n = [...inputs]; n[i] = n[i] ? 0 : 1; setInputs(n); }} className="cursor-pointer">
                        <rect x="0" y="0" width="10" height="30" fill="white" rx="1" />
                        <rect x="0" y={inputs[i] ? 0 : 15} width="10" height="15" fill="#1e3a8a" rx="1" />
                        <text x="5" y="42" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">{lbl}</text>
                     </g>
                   ))}
                </g>
                {activeRecipe.outputs.map((lbl, i) => {
                   const pos = getCoords('LED', `LED_${i}`, activeRecipe.chips);
                   if (pos.x === 0) return null;
                   const isOn = outputs[i];
                   return (
                     <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
                        <path d="M -50 15 L -10 15" stroke="#9ca3af" strokeWidth="2" />
                        <rect x="-40" y="11" width="20" height="8" fill="#e5e7eb" stroke="#d1d5db" rx="2" />
                        <rect x="-35" y="11" width="3" height="8" fill="#d97706" /><rect x="-30" y="11" width="3" height="8" fill="#d97706" /><rect x="-25" y="11" width="3" height="8" fill="#78350f" />
                        <line x1="0" y1="0" x2="0" y2="15" stroke="#9ca3af" strokeWidth="2" /><line x1="-8" y1="0" x2="-8" y2="15" stroke="#9ca3af" strokeWidth="2" />
                        <circle cx="-4" cy="0" r="8" fill={isOn ? COLORS.LED_ON : COLORS.LED_OFF} />
                        {isOn && <circle cx="-4" cy="0" r="14" fill={COLORS.LED_ON} opacity="0.4" className="animate-pulse" />}
                        <text x="15" y="5" fill="#9ca3af" fontSize="12" fontWeight="bold">{lbl}</text>
                     </g>
                   );
                })}
                {activeRecipe.wires.map((w, i) => {
                   let p1 = {x:0, y:0}, p2 = {x:0, y:0};
                   if (w.s === 'VCC') p1 = getCoords('RAIL_VCC'); else if (w.s === 'GND') p1 = getCoords('RAIL_GND'); else if (typeof w.s === 'string' && w.s.includes('SW')) p1 = getCoords('SW', w.s); else p1 = getCoords('PIN', w.s, activeRecipe.chips);
                   if (typeof w.e === 'string' && w.e.includes('LED')) p2 = getCoords('LED', w.e); else p2 = getCoords('PIN', w.e, activeRecipe.chips);
                   return <Wire key={i} p1={p1} p2={p2} color={COLORS[w.color] || COLORS.WIRE_GREEN} />
                })}
             </svg>
           </div>
        </div>
      </div>
    </div>
  );
}