import { scrubPHI } from "../phi"

interface TestCase {
  name: string
  input: string
  expected: string
}

const testCases: TestCase[] = [
  // 1. Email cases (5)
  {
    name: "Standard email",
    input: "Send report to doctor.john@aether.com",
    expected: "Send report to [REDACTED_EMAIL]"
  },
  {
    name: "Email with underscores and subdomains",
    input: "Contact ana_maria.silva@clinical.hc.fm.usp.br immediately",
    expected: "Contact [REDACTED_EMAIL] immediately"
  },
  {
    name: "Multiple emails",
    input: "From: doc1@hosp.com, CC: doc2@hosp.com",
    expected: "From: [REDACTED_EMAIL], CC: [REDACTED_EMAIL]"
  },
  {
    name: "Email inside brackets",
    input: "Patient requested copy to [patient.email@outlook.com]",
    expected: "Patient requested copy to [[REDACTED_EMAIL]]"
  },
  {
    name: "Email with query/plus sign",
    input: "support+oncology@aether.org is the endpoint",
    expected: "[REDACTED_EMAIL] is the endpoint"
  },

  // 2. Brazilian Phone cases (10)
  {
    name: "Formatted BR cell phone with DDI and DDD",
    input: "Ligar para +55 (11) 98765-4321",
    expected: "Ligar para [REDACTED_PHONE]"
  },
  {
    name: "Formatted BR cell phone with DDD and space",
    input: "Telefone do responsável: (21) 98888-7766",
    expected: "Telefone do responsável: [REDACTED_PHONE]"
  },
  {
    name: "BR cell phone without brackets",
    input: "Contato: 19 97777-6655",
    expected: "Contato: [REDACTED_PHONE]"
  },
  {
    name: "BR cell phone without hyphen",
    input: "Telefone: (31) 966665544",
    expected: "Telefone: [REDACTED_PHONE]"
  },
  {
    name: "BR landline formatted",
    input: "Falar no (11) 3456-7890 da recepção",
    expected: "Falar no [REDACTED_PHONE] da recepção"
  },
  {
    name: "BR cell phone raw digits",
    input: "Número: 11955554433",
    expected: "Número: [REDACTED_PHONE]"
  },
  {
    name: "BR cell phone raw with DDI",
    input: "WhatsApp: 5511944443322",
    expected: "WhatsApp: [REDACTED_PHONE]"
  },
  {
    name: "BR cell phone raw with DDI and plus sign",
    input: "Fins de emergência: +5511933332211",
    expected: "Fins de emergência: [REDACTED_PHONE]"
  },
  {
    name: "BR landline without formatting",
    input: "Número fixo: 1133221100",
    expected: "Número fixo: [REDACTED_PHONE]"
  },
  {
    name: "BR phone with spaces and dashes",
    input: "Número: 011 9 1234 - 5678",
    expected: "Número: [REDACTED_PHONE]"
  },

  // 3. CPF cases (10)
  {
    name: "Standard formatted CPF",
    input: "CPF do paciente é 123.456.789-00",
    expected: "CPF do paciente é [REDACTED_CPF]"
  },
  {
    name: "Formatted CPF with another standard digit set",
    input: "RG: 12.345.678-9, CPF: 987.654.321-99",
    expected: "RG: 12.345.678-9, CPF: [REDACTED_CPF]"
  },
  {
    name: "Unformatted raw CPF",
    input: "CPF: 11122233344",
    expected: "CPF: [REDACTED_CPF]"
  },
  {
    name: "Multiple CPFs in text",
    input: "Médico: 111.111.111-11, Paciente: 222.222.222-22",
    expected: "Médico: [REDACTED_CPF], Paciente: [REDACTED_CPF]"
  },
  {
    name: "CPF starting with zeros formatted",
    input: "CPF: 009.876.543-21",
    expected: "CPF: [REDACTED_CPF]"
  },
  {
    name: "CPF starting with zeros raw",
    input: "Número de documento: 00987654321",
    expected: "Número de documento: [REDACTED_CPF]"
  },
  {
    name: "CPF inside parentheses",
    input: "Paciente Mario Silva (444.555.666-77) admitido",
    expected: "Paciente Mario Silva ([REDACTED_CPF]) admitido"
  },
  {
    name: "CPF with missing dots but having hyphen",
    input: "Documento: 123456789-00",
    expected: "Documento: [REDACTED_CPF]"
  },
  {
    name: "CPF with dots but missing hyphen",
    input: "Documento: 123.456.78900",
    expected: "Documento: [REDACTED_CPF]"
  },
  {
    name: "CPF with spaces instead of dots",
    input: "CPF: 123 456 789 00",
    expected: "CPF: [REDACTED_CPF]"
  },

  // 4. Date of Birth / DOB cases (8)
  {
    name: "DOB with slashes",
    input: "Data de nascimento: 12/05/1984",
    expected: "Data de nascimento: [REDACTED_DOB]"
  },
  {
    name: "DOB with dashes",
    input: "Nascido em: 31-12-1999",
    expected: "Nascido em: [REDACTED_DOB]"
  },
  {
    name: "DOB ISO format",
    input: "Data no prontuário: 1975-08-25",
    expected: "Data no prontuário: [REDACTED_DOB]"
  },
  {
    name: "DOB with dots",
    input: "Nasc: 01.01.2010",
    expected: "Nasc: [REDACTED_DOB]"
  },
  {
    name: "DOB with single digit day/month",
    input: "Nascimento: 02/03/1990",
    expected: "Nascimento: [REDACTED_DOB]"
  },
  {
    name: "DOB in database query format",
    input: "SELECT * FROM patients WHERE dob = '1988-11-04'",
    expected: "SELECT * FROM patients WHERE dob = '[REDACTED_DOB]'"
  },
  {
    name: "DOB with slash and spaces",
    input: "Nascimento: 15 / 08 / 1993",
    expected: "Nascimento: [REDACTED_DOB]"
  },
  {
    name: "Multiple DOBs",
    input: "Mãe: 14/02/1970, Filho: 20/09/2005",
    expected: "Mãe: [REDACTED_DOB], Filho: [REDACTED_DOB]"
  },

  // 5. CNS / SUS Card cases (6)
  {
    name: "Raw CNS 15 digits starting with 1",
    input: "Cartão SUS: 123456789012345",
    expected: "Cartão SUS: [REDACTED_SUS]"
  },
  {
    name: "Raw CNS 15 digits starting with 8",
    input: "CNS número 899999999999999",
    expected: "CNS número [REDACTED_SUS]"
  },
  {
    name: "Formatted CNS with spaces starting with 2",
    input: "Nº SUS: 203 4567 8901 2345",
    expected: "Nº SUS: [REDACTED_SUS]"
  },
  {
    name: "Formatted CNS with spaces starting with 7",
    input: "CNS: 700 1234 5678 9012",
    expected: "CNS: [REDACTED_SUS]"
  },
  {
    name: "CNS inside brackets",
    input: "Paciente registrado sob SUS [899 1111 2222 3333]",
    expected: "Paciente registrado sob SUS [[REDACTED_SUS]]"
  },
  {
    name: "CNS raw digit sequence starting with 9",
    input: "CNS: 987654321098765",
    expected: "CNS: [REDACTED_SUS]"
  },

  // 6. CRM Medical cases (7)
  {
    name: "CRM with slash and state",
    input: "Dr. Marcos, CRM/SP 123456",
    expected: "Dr. Marcos, [REDACTED_CRM]"
  },
  {
    name: "CRM with hyphen and state",
    input: "Dra. Julia, CRM-RJ 98765",
    expected: "Dra. Julia, [REDACTED_CRM]"
  },
  {
    name: "CRM with state first",
    input: "Assinado por: 123456/CRM-MG",
    expected: "Assinado por: [REDACTED_CRM]"
  },
  {
    name: "CRM with space and state",
    input: "CRM DF 12345",
    expected: "[REDACTED_CRM]"
  },
  {
    name: "CRM simple without state",
    input: "CRM 123456",
    expected: "[REDACTED_CRM]"
  },
  {
    name: "CRM in lowercase",
    input: "crm/sp 99887",
    expected: "[REDACTED_CRM]"
  },
  {
    name: "CRM with spaces and hyphens",
    input: "CRM - PR : 12345",
    expected: "[REDACTED_CRM]"
  },

  // 7. CEP cases (5)
  {
    name: "Formatted CEP",
    input: "Endereço: CEP 01310-930, São Paulo",
    expected: "Endereço: CEP [REDACTED_CEP], São Paulo"
  },
  {
    name: "CEP with spaces",
    input: "CEP: 80020 - 100",
    expected: "CEP: [REDACTED_CEP]"
  },
  {
    name: "CEP inside address text",
    input: "Rua das Flores, CEP: 12345-678, Curitiba",
    expected: "Rua das Flores, CEP: [REDACTED_CEP], Curitiba"
  },
  {
    name: "CEP with suffix only",
    input: "CEP 99999-999",
    expected: "CEP [REDACTED_CEP]"
  },
  {
    name: "CEP in a sentence",
    input: "O CEP da clínica é 04533-010.",
    expected: "O CEP da clínica é [REDACTED_CEP]."
  },

  // 8. Combinations of multiple PHI (4)
  {
    name: "Full Patient Admission Record",
    input: "Paciente Mario Silva, CPF 123.456.789-00, Nasc: 12/03/1995, SUS: 123 4567 8901 2345, Tel: (11) 98765-4321, CEP: 01310-930",
    expected: "Paciente Mario Silva, CPF [REDACTED_CPF], Nasc: [REDACTED_DOB], SUS: [REDACTED_SUS], Tel: [REDACTED_PHONE], CEP: [REDACTED_CEP]"
  },
  {
    name: "Clinical email with phone and CRM",
    input: "Encaminhar para Dra. Ana (crm/rj 12345) no email ana@oncoclinica.com ou ligar no 21998887766",
    expected: "Encaminhar para Dra. Ana ([REDACTED_CRM]) no email [REDACTED_EMAIL] ou ligar no [REDACTED_PHONE]"
  },
  {
    name: "Raw numeric parameters",
    input: "Valores do CPF 98765432100 e CNS 899111122223333 no prontuário.",
    expected: "Valores do CPF [REDACTED_CPF] e CNS [REDACTED_SUS] no prontuário."
  },
  {
    name: "Dates and CEP combo",
    input: "Consulta agendada para nascido em 2005-09-20 residente no CEP 80000-000",
    expected: "Consulta agendada para nascido em [REDACTED_DOB] residente no CEP [REDACTED_CEP]"
  }
]

function runTests() {
  console.log("==================================================")
  console.log(`Running PHI Scrubber Test Suite: ${testCases.length} Cases`)
  console.log("==================================================")

  let passed = 0
  let failed = 0

  for (const tc of testCases) {
    try {
      const result = scrubPHI(tc.input)
      if (result === tc.expected) {
        passed++
      } else {
        failed++
        console.error(`FAIL: ${tc.name}`)
        console.error(`  Input:    "${tc.input}"`)
        console.error(`  Expected: "${tc.expected}"`)
        console.error(`  Got:      "${result}"`)
        console.log("--------------------------------------------------")
      }
    } catch (err) {
      failed++
      console.error(`FAIL: ${tc.name} (Threw exception)`)
      console.error(err)
      console.log("--------------------------------------------------")
    }
  }

  // Test the Exception Trigger for Fail-Closed verification
  try {
    scrubPHI("TRIGGER_SCRUBBER_ERROR")
    failed++
    console.error("FAIL: Exception Trigger did not throw an exception")
  } catch (err: any) {
    if (err.message === "Simulated PHI Scrubber Exception") {
      passed++
      console.log("PASS: Exception Trigger threw correct simulated error")
    } else {
      failed++
      console.error(`FAIL: Exception Trigger threw incorrect error: ${err.message}`)
    }
  }

  console.log("==================================================")
  console.log(`Test Execution Finished. Passed: ${passed}, Failed: ${failed}`)
  console.log("==================================================")

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

// Run tests if called directly
runTests()
