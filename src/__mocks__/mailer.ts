const transporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  verify: jest.fn().mockResolvedValue(true),
  close: jest.fn(),
};

export default transporter;