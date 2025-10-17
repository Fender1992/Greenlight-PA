/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Patient Management | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data for demo
const MOCK_PATIENTS = [
  {
    id: "patient-001",
    name: "Smith, John",
    dob: "01/15/1975",
    gender: "M",
    memberId: "BC123456789",
    payer: "Blue Cross Blue Shield",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    lastVisit: "2025-10-15",
    activePAs: 1,
    totalPAs: 3,
  },
  {
    id: "patient-002",
    name: "Doe, Jane",
    dob: "05/22/1982",
    gender: "F",
    memberId: "AET987654321",
    payer: "Aetna",
    phone: "(555) 234-5678",
    email: "jane.doe@email.com",
    lastVisit: "2025-10-14",
    activePAs: 2,
    totalPAs: 5,
  },
  {
    id: "patient-003",
    name: "Johnson, Mary",
    dob: "11/08/1968",
    gender: "F",
    memberId: "UHC111222333",
    payer: "United Healthcare",
    phone: "(555) 345-6789",
    email: "mary.j@email.com",
    lastVisit: "2025-10-08",
    activePAs: 0,
    totalPAs: 8,
  },
  {
    id: "patient-004",
    name: "Williams, Robert",
    dob: "03/30/1990",
    gender: "M",
    memberId: "CIG444555666",
    payer: "Cigna",
    phone: "(555) 456-7890",
    email: "rwilliams@email.com",
    lastVisit: "2025-10-12",
    activePAs: 1,
    totalPAs: 2,
  },
];

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = MOCK_PATIENTS.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      searchQuery === "" ||
      patient.name.toLowerCase().includes(query) ||
      patient.memberId.toLowerCase().includes(query) ||
      patient.payer.toLowerCase().includes(query)
    );
  });

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage patient records
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            + Add Patient
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="max-w-md">
          <label
            htmlFor="patient-search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Search Patients
          </label>
          <input
            type="text"
            id="patient-search"
            placeholder="Name, Member ID, or Payer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                DOB / Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Visit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PAs
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPatients.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No patients found
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/dashboard/patients/${patient.id}`)
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {patient.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.dob} / {patient.gender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.memberId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.payer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{patient.phone}</div>
                    <div className="text-xs">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.lastVisit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Active: {patient.activePAs}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {patient.totalPAs}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Patients</div>
          <div className="text-2xl font-bold text-gray-900">
            {MOCK_PATIENTS.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active PAs</div>
          <div className="text-2xl font-bold text-blue-600">
            {MOCK_PATIENTS.reduce((sum, p) => sum + p.activePAs, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total PAs</div>
          <div className="text-2xl font-bold text-gray-600">
            {MOCK_PATIENTS.reduce((sum, p) => sum + p.totalPAs, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg PAs per Patient</div>
          <div className="text-2xl font-bold text-gray-900">
            {(
              MOCK_PATIENTS.reduce((sum, p) => sum + p.totalPAs, 0) /
              MOCK_PATIENTS.length
            ).toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
