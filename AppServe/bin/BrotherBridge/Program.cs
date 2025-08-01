// AppServe/bin/BrotherBridge/Program.cs
using System;
using System.Text.Json;

// IMPORTANT: Ajouter la référence COM vers "Brother b-PAC 3.x Document"
// Projet -> Ajouter une référence -> COM -> Brother b-PAC 3.x Document
using bpac;

namespace BrotherBridge
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                if (args.Length == 0)
                {
                    ShowHelp();
                    return 1;
                }

                switch (args[0])
                {
                    case "--health":
                        return HandleHealthCheck();
                    case "--list-printers":
                        return HandleListPrinters();
                    default:
                        Console.WriteLine(JsonSerializer.Serialize(new { 
                            success = false, 
                            error = "Action non supportée: " + args[0] 
                        }));
                        return 1;
                }
            }
            catch (Exception ex)
            {
                var errorResponse = new
                {
                    success = false,
                    error = ex.Message,
                    timestamp = DateTime.UtcNow.ToString("O")
                };
                Console.WriteLine(JsonSerializer.Serialize(errorResponse));
                return 1;
            }
        }

        static void ShowHelp()
        {
            Console.WriteLine("Brother b-PAC Bridge");
            Console.WriteLine("Usage:");
            Console.WriteLine("  --health          Vérifier l'état du système");
            Console.WriteLine("  --list-printers   Lister les imprimantes");
        }

        static int HandleHealthCheck()
        {
            try
            {
                // Tester la création d'un document b-PAC
                Document doc = new Document();
                doc.Close();

                var response = new
                {
                    success = true,
                    status = "ok",
                    version = "1.0.0",
                    bridgeAvailable = true,
                    timestamp = DateTime.UtcNow.ToString("O")
                };
                Console.WriteLine(JsonSerializer.Serialize(response));
                return 0;
            }
            catch (Exception ex)
            {
                var response = new
                {
                    success = false,
                    status = "error",
                    error = ex.Message,
                    bridgeAvailable = false,
                    timestamp = DateTime.UtcNow.ToString("O")
                };
                Console.WriteLine(JsonSerializer.Serialize(response));
                return 1;
            }
        }

        static int HandleListPrinters()
        {
            Document doc = new Document();
            try
            {
                var printer = doc.Printer;
                var installedPrinters = printer.GetInstalledPrinters();

                var response = new
                {
                    success = true,
                    printers = installedPrinters ?? new string[0],
                    count = installedPrinters?.Length ?? 0
                };
                Console.WriteLine(JsonSerializer.Serialize(response));
                return 0;
            }
            catch (Exception ex)
            {
                var response = new
                {
                    success = false,
                    error = ex.Message,
                    printers = new string[0]
                };
                Console.WriteLine(JsonSerializer.Serialize(response));
                return 1;
            }
            finally
            {
                doc.Close();
            }
        }
    }
}