// Lightweight, zero-dependency QR Code generator in pure TypeScript
// Based on Kazuhiko Arase's QR Code specification (MIT License)

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

class QRBitBuffer {
  buffer: number[] = [];
  length: number = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  getLengthInBits(): number {
    return this.length;
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

class QRPolynomial {
  num: number[];

  constructor(num: number[], shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gmult(this.get(i), e.get(j));
      }
    }
    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QRMath {
  private static EXP_TABLE: number[] = new Array(256);
  private static LOG_TABLE: number[] = new Array(256);

  static init(): void {
    for (let i = 0; i < 8; i++) {
      QRMath.EXP_TABLE[i] = 1 << i;
    }
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) {
      QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
    }
  }

  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return QRMath.EXP_TABLE[n];
  }

  static glog(n: number): number {
    if (n < 1) throw new Error("glog(" + n + ")");
    return QRMath.LOG_TABLE[n];
  }

  static gmult(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return QRMath.gexp(QRMath.glog(a) + QRMath.glog(b));
  }
}
QRMath.init();

class QRRSBlock {
  totalCount: number;
  dataCount: number;

  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  static getRSBlocks(typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel): QRRSBlock[] {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (!rsBlock) throw new Error(`bad rs block @ typeNumber:${typeNumber}`);
    const length = rsBlock.length / 3;
    const list: QRRSBlock[] = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  }

  private static getRsBlockTable(
    typeNumber: number,
    errorCorrectionLevel: ErrorCorrectionLevel,
  ): number[] | undefined {
    switch (errorCorrectionLevel) {
      case "L":
        return [
          [1, 26, 19],
          [1, 44, 34],
          [1, 70, 55],
          [1, 100, 80],
          [1, 134, 108],
          [2, 86, 68],
          [2, 98, 78],
          [2, 121, 97],
          [2, 146, 116],
          [2, 86, 68, 2, 87, 69],
        ][typeNumber - 1];
      case "M":
        return [
          [1, 26, 16],
          [1, 44, 28],
          [1, 70, 44],
          [2, 50, 32],
          [2, 67, 43],
          [4, 43, 27],
          [4, 49, 31],
          [2, 73, 45, 2, 74, 46],
          [3, 58, 36, 2, 59, 37],
          [4, 69, 43, 1, 70, 44],
        ][typeNumber - 1];
      case "Q":
        return [
          [1, 26, 13],
          [1, 44, 22],
          [2, 35, 17],
          [2, 50, 24],
          [2, 33, 15, 2, 34, 16],
          [4, 43, 19],
          [2, 32, 14, 4, 33, 15],
          [4, 39, 18, 2, 40, 19],
          [4, 36, 16, 4, 37, 17],
          [6, 43, 19, 2, 44, 20],
        ][typeNumber - 1];
      case "H":
        return [
          [1, 26, 9],
          [1, 44, 16],
          [2, 35, 13],
          [4, 25, 9],
          [2, 33, 11, 2, 34, 12],
          [4, 28, 10, 2, 29, 11],
          [4, 26, 10, 2, 27, 11],
          [4, 31, 11, 2, 32, 12],
          [4, 33, 12, 4, 34, 13],
          [6, 39, 14, 2, 40, 15],
        ][typeNumber - 1];
    }
  }
}

class QRCodeModel {
  private modules: (boolean | null)[][] = [];
  private moduleCount: number = 0;
  private dataList: number[] = [];
  typeNumber: number;
  errorCorrectionLevel: ErrorCorrectionLevel;

  constructor(typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = Array.from({ length: this.moduleCount }, () =>
      new Array(this.moduleCount).fill(null),
    );
  }

  addData(data: string): void {
    const bytes = new TextEncoder().encode(data);
    for (let i = 0; i < bytes.length; i++) {
      this.dataList.push(bytes[i]);
    }
  }

  isDark(row: number, col: number): boolean {
    return this.modules[row][col] === true;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make(): void {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = Array.from({ length: this.moduleCount }, () =>
      new Array(this.moduleCount).fill(null),
    );

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupTimingPattern();
    this.setupPositionAdjustPattern();

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    const data = QRCodeModel.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
    this.mapData(data, maskPattern);
    this.setupTypeInfo(test, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern(): void {
    const pos = QRCodeModel.getPatternPositions(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private static getPatternPositions(typeNumber: number): number[] {
    const patternTable = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
    ];
    return patternTable[typeNumber - 1] || [];
  }

  private setupTypeNumber(test: boolean): void {
    const bits = QRCodeModel.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (this.getErrorCorrectionCode() << 3) | maskPattern;
    const bits = QRCodeModel.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }
    this.modules[this.moduleCount - 8][8] = !test;
  }

  private getErrorCorrectionCode(): number {
    switch (this.errorCorrectionLevel) {
      case "L":
        return 1;
      case "M":
        return 0;
      case "Q":
        return 3;
      case "H":
        return 2;
    }
  }

  private mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = QRCodeModel.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private static getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0:
        return (i + j) % 2 === 0;
      case 1:
        return i % 2 === 0;
      case 2:
        return j % 3 === 0;
      case 3:
        return (i + j) % 3 === 0;
      case 4:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5:
        return ((i * j) % 2) + ((i * j) % 3) === 0;
      case 6:
        return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case 7:
        return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default:
        throw new Error(`bad maskPattern:${maskPattern}`);
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRCodeModel.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  private static getLostPoint(qrCode: QRCodeModel): number {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }

    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }

    return lostPoint;
  }

  private static createData(
    typeNumber: number,
    errorCorrectionLevel: ErrorCorrectionLevel,
    dataList: number[],
  ): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    const buffer = new QRBitBuffer();
    // 8-bit Byte mode
    buffer.put(4, 4);
    buffer.put(dataList.length, typeNumber < 10 ? 8 : 16);
    for (let i = 0; i < dataList.length; i++) {
      buffer.put(dataList[i], 8);
    }

    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error(
        `Data overflow: ${buffer.getLengthInBits()} bits > ${totalDataCount * 8} bits`,
      );
    }

    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false);
    }
    while (buffer.getLengthInBits() < totalDataCount * 8) {
      buffer.put(0xec, 8);
      if (buffer.getLengthInBits() < totalDataCount * 8) {
        buffer.put(0x11, 8);
      }
    }

    return QRCodeModel.createBytes(buffer, rsBlocks);
  }

  private static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata: number[][] = new Array(rsBlocks.length);
    const ecdata: number[][] = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;

      const rsPoly = QRCodeModel.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    const data: number[] = [];
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) data.push(dcdata[r][i]);
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) data.push(ecdata[r][i]);
      }
    }

    return data;
  }

  private static getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }

  private static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(1335) >= 0) {
      d ^= 1335 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(1335));
    }
    return ((data << 10) | d) ^ 21522;
  }

  private static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(7973) >= 0) {
      d ^= 7973 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(7973));
    }
    return (data << 12) | d;
  }

  private static getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
}

/**
 * Creates SVG representation of QR code with zero dependencies.
 */
export function createQrSvg(
  text: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    margin?: number;
    size?: number;
  } = {},
): string {
  const { colorDark = "#0D1B2A", colorLight = "#FFFFFF", margin = 2, size = 400 } = options;

  const byteLen = new TextEncoder().encode(text).length;
  let typeNumber = 1;
  const limits = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
  for (let i = 0; i < limits.length; i++) {
    if (byteLen <= limits[i]) {
      typeNumber = i + 1;
      break;
    }
  }

  const qr = new QRCodeModel(typeNumber, "M");
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const totalCells = moduleCount + margin * 2;
  const cellSize = size / totalCells;

  let pathData = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = (col + margin) * cellSize;
        const y = (row + margin) * cellSize;
        pathData += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${colorLight}"/>
    <path d="${pathData}" fill="${colorDark}"/>
  </svg>`;
}

/**
 * Generates PNG Data URL in browser using HTML5 Canvas with SVG fallback
 */
export async function createQrDataUrl(
  text: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    margin?: number;
    size?: number;
  } = {},
): Promise<string> {
  const svg = createQrSvg(text, options);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  if (typeof window === "undefined" || !document?.createElement) {
    return svgDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = options.size || 500;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
          return;
        }
      } catch {
        // fallback
      }
      resolve(svgDataUrl);
    };
    img.onerror = () => resolve(svgDataUrl);
    img.src = svgDataUrl;
  });
}
