# Manda um arquivo de bytes (ESC/POS) CRU pra uma impressora instalada no Windows,
# sem passar pelo driver (o driver "Generic / Text Only" só repassa os bytes).
#
#   powershell -File scripts\impressora\raw-print.ps1 -Impressora "NOME" -Arquivo comanda.bin
#   powershell -File scripts\impressora\raw-print.ps1 -Listar
param(
    [string]$Impressora,
    [string]$Arquivo,
    [switch]$Listar
)

if ($Listar) {
    Get-Printer | Select-Object Name, DriverName, PortName | Format-Table -AutoSize
    return
}
if (-not $Impressora -or -not $Arquivo) { throw 'Use -Impressora "nome" -Arquivo caminho.bin (ou -Listar)' }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static string Enviar(string impressora, byte[] bytes)
    {
        IntPtr h;
        if (!OpenPrinter(impressora, out h, IntPtr.Zero)) return "OpenPrinter falhou (erro " + Marshal.GetLastWin32Error() + "). O nome está certo?";
        var di = new DOCINFOA { pDocName = "Totem ESC/POS", pDataType = "RAW" };
        string erro = null;
        if (StartDocPrinter(h, 1, di))
        {
            if (StartPagePrinter(h))
            {
                IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
                Marshal.Copy(bytes, 0, p, bytes.Length);
                int escritos;
                if (!WritePrinter(h, p, bytes.Length, out escritos)) erro = "WritePrinter falhou (erro " + Marshal.GetLastWin32Error() + ")";
                Marshal.FreeCoTaskMem(p);
                EndPagePrinter(h);
            }
            else erro = "StartPagePrinter falhou";
            EndDocPrinter(h);
        }
        else erro = "StartDocPrinter falhou (erro " + Marshal.GetLastWin32Error() + ")";
        ClosePrinter(h);
        return erro;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Arquivo))
$erro = [RawPrinter]::Enviar($Impressora, $bytes)
if ($erro) { throw $erro }
Write-Host "Enviado: $($bytes.Length) bytes para '$Impressora'."
