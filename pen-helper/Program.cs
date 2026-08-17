using System.Runtime.InteropServices;

internal static class Program
{
    private const ushort VkF13 = 0x7C;
    private const uint InputKeyboard = 1;
    private const uint KeyEventFKeyUp = 0x0002;

    [STAThread]
    private static int Main()
    {
        var inputs = new[]
        {
            CreateKeyboardInput(0),
            CreateKeyboardInput(KeyEventFKeyUp),
        };

        var inputSize = Marshal.SizeOf<INPUT>();
        var sent = SendInput((uint)inputs.Length, inputs, inputSize);
        WriteDiagnostic(sent, inputSize);
        if (sent == inputs.Length)
        {
            return 0;
        }

        return 1;
    }

    private static void WriteDiagnostic(uint sent, int inputSize)
    {
        var directory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Draw50");
        Directory.CreateDirectory(directory);
        File.AppendAllText(
            Path.Combine(directory, "F13Helper.log"),
            $"{DateTimeOffset.UtcNow:O} SendInput={sent}/2 InputSize={inputSize}{Environment.NewLine}");
    }

    private static INPUT CreateKeyboardInput(uint flags) =>
        new()
        {
            Type = InputKeyboard,
            Union = new InputUnion
            {
                Keyboard = new KEYBDINPUT
                {
                    Vk = VkF13,
                    Flags = flags,
                },
            },
        };

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint inputCount, INPUT[] inputs, int inputSize);

    [StructLayout(LayoutKind.Sequential)]
    private struct INPUT
    {
        public uint Type;
        public InputUnion Union;
    }

    // Native INPUT contains a union whose largest member is MOUSEINPUT (32 bytes on win-x64).
    [StructLayout(LayoutKind.Explicit, Size = 32)]
    private struct InputUnion
    {
        [FieldOffset(0)]
        public KEYBDINPUT Keyboard;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KEYBDINPUT
    {
        public ushort Vk;
        public ushort Scan;
        public uint Flags;
        public uint Time;
        public nint ExtraInfo;
    }
}
