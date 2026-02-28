<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card color="deep-purple" dark>
          <v-card-text class="text-center py-4">
            <v-icon class="mb-2" icon="mdi-database-import" size="40" />
            <h1 class="text-h4 mb-1">Data Import Tools</h1>
            <p class="text-subtitle-1">
              Import and migrate data!
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Import Tools Grid -->
    <v-row class="mb-6">
      <v-col
        v-for="tool in importTools"
        :key="tool.title"
        cols="12"
        lg="4"
        md="6"
      >
        <v-card
          class="h-100 import-tool-card"
          :class="{ 'tool-disabled': tool.disabled }"
          :color="tool.color"
          @click="tool.action"
        >
          <v-card-text class="text-center pa-6">
            <v-icon
              class="mb-4"
              :color="tool.disabled ? 'grey' : 'white'"
              :icon="tool.icon"
              size="48"
            />
            <h3 class="text-h6 mb-2" :class="{ 'text-grey': tool.disabled }">
              {{ tool.title }}
            </h3>
            <p class="text-body-2 mb-3" :class="{ 'text-grey-lighten-1': tool.disabled }">
              {{ tool.description }}
            </p>
            <v-chip
              :color="tool.disabled ? 'grey' : 'white'"
              size="small"
              :text-color="tool.disabled ? 'white' : tool.color"
              variant="flat"
            >
              {{ tool.status }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dispatch Routing Import Dialog -->
    <v-dialog v-model="dispatchRoutingDialog" max-width="800px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" :icon="currentImportType === 'driver-board' ? 'mdi-truck-fast' : 'mdi-map-marker-multiple'" />
          {{ currentImportType === 'driver-board' ? 'Import Driver Board' : 'Import Endpoints' }}
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="closeDispatchRoutingDialog"
          />
        </v-card-title>

        <v-card-text>
          <v-stepper v-model="importStep" hide-actions :items="importSteps">
            <!-- Step 1: File Upload -->
            <template #item.1>
              <v-card flat>
                <v-card-text>
                  <h3 class="text-h6 mb-4">Select Excel File</h3>

                  <v-file-input
                    v-model="selectedFile"
                    accept=".xlsx,.xls"
                    clearable
                    label="Choose Excel file"
                    prepend-icon="mdi-file-delimited"
                    :rules="fileRules"
                    show-size
                    variant="outlined"
                  />

                  <v-alert
                    v-if="fileError"
                    class="mt-3"
                    closable
                    type="error"
                    @click:close="fileError = ''"
                  >
                    {{ fileError }}
                  </v-alert>

                  <v-card class="mt-4" variant="outlined">
                    <v-card-title class="text-subtitle-1">
                      <v-icon class="mr-2" icon="mdi-information" />
                      Expected File Format
                    </v-card-title>
                    <v-card-text>
                      <div v-if="currentImportType === 'driver-board'">
                        <p class="text-body-2 mb-2">
                          The Excel file should contain driver board worksheets and terminal supervisors:
                        </p>
                        <ul class="text-body-2">
                          <li><strong>DB-* Sheets:</strong> Driver board assignments with columns: Route, Driver, Fuel Card, Truck #, Sub Unit, Truck Type, Truck Status, Scanner</li>
                          <li><strong>SUP-Terminal Sheet:</strong> Terminal supervisors with columns: Terminal, Name (First Last), Position</li>
                        </ul>
                        <p class="text-body-2 mb-2">
                          <strong>Driver Board Details:</strong>
                        </p>
                        <ul class="text-body-2 ml-4">
                          <li><strong>Route:</strong> The route identifier (TRKID) to update</li>
                          <li><strong>Driver:</strong> Driver name to assign as default driver</li>
                          <li><strong>Truck #:</strong> Truck number to assign to the route (creates equipment entry)</li>
                          <li><strong>Sub Unit:</strong> Sub-unit number (creates substitute equipment entry)</li>
                          <li><strong>Fuel Card, Scanner:</strong> Additional route assignment data</li>
                        </ul>
                        <p class="text-body-2 mb-2">
                          <strong>Terminal Supervisors Details:</strong>
                        </p>
                        <ul class="text-body-2 ml-4">
                          <li><strong>Terminal:</strong> Terminal name (must match existing terminal)</li>
                          <li><strong>Name:</strong> Full name of person (First Last format)</li>
                          <li><strong>Position:</strong> Job title. If "Bench Driver", person will be assigned to terminal's bench driver list</li>
                        </ul>
                        <p class="text-caption text-warning mt-2">
                          Routes, drivers, and terminals must already exist in the system. Unmatched items will be reported.
                        </p>
                      </div>
                      <div v-else>
                        <p class="text-body-2 mb-2">
                          The Excel file should contain up to three worksheets:
                        </p>
                        <ul class="text-body-2">
                          <li><strong>Routes Sheet:</strong> Route stop data with columns: TRKID, AGENT, CID, CUSTNAME, Address, CITY, ST, ZIP, Time Zone, ETA, ETD, CommitTime, FTime, Cube, OpenTime, CloseTime, Terminal, Lanter_ID, Customer_PDC, LATITUDE, LONGITUDE, GEORESULT, LegNumber, Seq</li>
                          <li><strong>Terminals Sheet (Optional):</strong> Terminal information with columns: Terminal, City, State, Street Address, Zip, Group (determines if terminal or hub), Latitude, Longitude, etc.</li>
                          <li><strong>ADL Sheet (Optional):</strong> Driver information with columns: First Name, Last Name, DOB, License Number, License State, Drivers License Type, License Type, Status, Worklist, Operating Authority, Driver Status, Hire Date, Termination Date, Rehire Date, Worker Classification, Primary Phone, Driver ID, GEOtab, License Exp Date, Driving Experience, CDL Driving Experience, Total number of years of driving experience</li>
                        </ul>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-card-text>
              </v-card>
            </template>

            <!-- Step 2: Preview Data -->
            <template #item.2>
              <v-card flat>
                <v-card-text>
                  <h3 class="text-h6 mb-4">Import Summary</h3>

                  <v-alert class="mb-4" type="info">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" icon="mdi-information" />
                      <span>Excel file contains {{ importSummary.totalRows }} data rows</span>
                    </div>
                  </v-alert>

                  <!-- Multi-sheet information -->
                  <v-card v-if="(importSummary as any).sheets" class="mb-4" variant="outlined">
                    <v-card-title>
                      <v-icon class="mr-2" icon="mdi-tab-multiple" />
                      {{ currentImportType === 'driver-board' ? 'Driver Board Sheets Found' : 'Worksheets Found' }}
                    </v-card-title>
                    <v-card-text>
                      <!-- Driver Board sheets display -->
                      <div v-if="currentImportType === 'driver-board'">
                        <v-row>
                          <v-col
                            v-for="sheet in (importSummary as any).sheets"
                            :key="sheet.name"
                            cols="12"
                            md="6"
                          >
                            <div class="d-flex align-center">
                              <v-icon
                                class="mr-2"
                                color="success"
                                icon="mdi-check-circle"
                              />
                              <div>
                                <div class="font-weight-medium">{{ sheet.name }}</div>
                                <div class="text-caption text-grey">
                                  {{ sheet.rows }} rows - {{ sheet.description }}
                                </div>
                              </div>
                            </div>
                          </v-col>
                        </v-row>
                      </div>
                      <!-- Endpoints sheets display -->
                      <v-row v-else>
                        <v-col cols="12" md="4">
                          <div class="d-flex align-center">
                            <v-icon
                              class="mr-2"
                              :color="(importSummary as any).sheets.routes.found ? 'success' : 'error'"
                              :icon="(importSummary as any).sheets.routes.found ? 'mdi-check-circle' : 'mdi-close-circle'"
                            />
                            <div>
                              <div class="font-weight-medium">Routes Sheet</div>
                              <div class="text-caption text-grey">
                                {{ (importSummary as any).sheets.routes.found
                                  ? `${(importSummary as any).sheets.routes.rows} rows - ${(importSummary as any).sheets.routes.description}`
                                  : 'Not found - no route data will be imported' }}
                              </div>
                            </div>
                          </div>
                        </v-col>
                        <v-col cols="12" md="4">
                          <div class="d-flex align-center">
                            <v-icon
                              class="mr-2"
                              :color="(importSummary as any).sheets.terminals.found ? 'success' : 'warning'"
                              :icon="(importSummary as any).sheets.terminals.found ? 'mdi-check-circle' : 'mdi-alert-circle'"
                            />
                            <div>
                              <div class="font-weight-medium">Terminals Sheet</div>
                              <div class="text-caption text-grey">
                                {{ (importSummary as any).sheets.terminals.found
                                  ? `${(importSummary as any).sheets.terminals.rows} rows - ${(importSummary as any).sheets.terminals.description}`
                                  : 'Not found - no terminal updates will be applied' }}
                              </div>
                            </div>
                          </div>
                        </v-col>
                        <v-col cols="12" md="4">
                          <div class="d-flex align-center">
                            <v-icon
                              class="mr-2"
                              :color="(importSummary as any).sheets.adl?.found ? 'success' : 'warning'"
                              :icon="(importSummary as any).sheets.adl?.found ? 'mdi-check-circle' : 'mdi-alert-circle'"
                            />
                            <div>
                              <div class="font-weight-medium">ADL Sheet</div>
                              <div class="text-caption text-grey">
                                {{ (importSummary as any).sheets.adl?.found
                                  ? `${(importSummary as any).sheets.adl.rows} rows - ${(importSummary as any).sheets.adl.description}`
                                  : 'Not found - no driver data will be imported' }}
                              </div>
                            </div>
                          </div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>

                  <v-row>
                    <!-- Driver Board Summary Cards -->
                    <template v-if="currentImportType === 'driver-board'">
                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="(importSummary as any).routeAssignments.count > 0 ? 'success' : 'warning'"
                              :icon="(importSummary as any).routeAssignments.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Route Assignments</h4>
                            <p class="text-body-2 text-grey mb-2">{{ (importSummary as any).routeAssignments.description }}</p>

                            <v-chip
                              :color="(importSummary as any).routeAssignments.count > 0 ? 'success' : 'warning'"
                              size="small"
                              variant="flat"
                            >
                              {{ (importSummary as any).routeAssignments.count }} will be updated
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="(importSummary as any).equipment.count > 0 ? 'success' : 'warning'"
                              :icon="(importSummary as any).equipment.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Equipment</h4>
                            <p class="text-body-2 text-grey mb-2">{{ (importSummary as any).equipment.description }}</p>

                            <v-chip
                              :color="(importSummary as any).equipment.count > 0 ? 'success' : 'warning'"
                              size="small"
                              variant="flat"
                            >
                              {{ (importSummary as any).equipment.count }} will be created
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <!-- Terminal Staff Cards (only show if SUP-Terminal sheet found) -->
                      <template v-if="(importSummary as any).benchDrivers?.count > 0 || (importSummary as any).leaders?.count > 0">
                        <v-col cols="12" md="6">
                          <v-card class="import-count-card" variant="outlined">
                            <v-card-text class="text-center pa-4">
                              <v-icon
                                class="mb-2"
                                :color="(importSummary as any).benchDrivers.count > 0 ? 'primary' : 'warning'"
                                :icon="(importSummary as any).benchDrivers.icon"
                                size="32"
                              />
                              <h4 class="text-h6 mb-1">Bench Drivers</h4>
                              <p class="text-body-2 text-grey mb-2">{{ (importSummary as any).benchDrivers.description }}</p>
                              <v-chip
                                :color="(importSummary as any).benchDrivers.count > 0 ? 'primary' : 'warning'"
                                size="small"
                                variant="flat"
                              >
                                {{ (importSummary as any).benchDrivers.count }} to assign
                              </v-chip>
                            </v-card-text>
                          </v-card>
                        </v-col>
                        
                        <v-col cols="12" md="6">
                          <v-card class="import-count-card" variant="outlined">
                            <v-card-text class="text-center pa-4">
                              <v-icon
                                class="mb-2"
                                :color="(importSummary as any).leaders.count > 0 ? 'secondary' : 'warning'"
                                :icon="(importSummary as any).leaders.icon"
                                size="32"
                              />
                              <h4 class="text-h6 mb-1">Terminal Operators</h4>
                              <p class="text-body-2 text-grey mb-2">{{ (importSummary as any).leaders.description }}</p>
                              <v-chip
                                :color="(importSummary as any).leaders.count > 0 ? 'secondary' : 'warning'"
                                size="small"
                                variant="flat"
                              >
                                {{ (importSummary as any).leaders.count }} to assign
                              </v-chip>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </template>

                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="(importSummary as any).unmatchedItems.count > 0 ? 'warning' : 'success'"
                              :icon="(importSummary as any).unmatchedItems.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Unmatched Items</h4>
                            <p class="text-body-2 text-grey mb-2">{{ (importSummary as any).unmatchedItems.description }}</p>

                            <v-chip
                              :color="(importSummary as any).unmatchedItems.count > 0 ? 'warning' : 'success'"
                              size="small"
                              variant="flat"
                            >
                              {{ (importSummary as any).unmatchedItems.count }} items need attention
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </template>

                    <!-- Endpoints Summary Cards -->
                    <template v-else>
                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="importSummary.terminals.count > 0 ? 'success' : 'warning'"
                              :icon="importSummary.terminals.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Terminals</h4>
                            <p class="text-body-2 text-grey mb-2">Terminal locations (created from Routes + updated from Terminals sheet)</p>

                            <div class="d-flex flex-column ga-2">
                              <v-chip
                                :color="importSummary.terminals.count > 0 ? 'success' : 'warning'"
                                size="small"
                                variant="flat"
                              >
                                {{ importSummary.terminals.count }} will be created
                              </v-chip>
                              <v-chip
                                v-if="(importSummary.terminals as any).updates > 0"
                                color="info"
                                size="small"
                                variant="flat"
                              >
                                {{ (importSummary.terminals as any).updates }} will be updated
                              </v-chip>
                            </div>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="importSummary.customers.count > 0 ? 'success' : 'warning'"
                              :icon="importSummary.customers.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Customers</h4>
                            <p class="text-body-2 text-grey mb-2">{{ importSummary.customers.description }}</p>

                            <v-chip
                              :color="importSummary.customers.count > 0 ? 'success' : 'warning'"
                              size="small"
                              variant="flat"
                            >
                              {{ importSummary.customers.count }} will be imported
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="importSummary.routes.count > 0 ? 'success' : 'warning'"
                              :icon="importSummary.routes.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Routes</h4>
                            <p class="text-body-2 text-grey mb-2">{{ importSummary.routes.description }}</p>

                            <v-chip
                              :color="importSummary.routes.count > 0 ? 'success' : 'warning'"
                              size="small"
                              variant="flat"
                            >
                              {{ importSummary.routes.count }} will be imported
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="importSummary.routeStops.count > 0 ? 'success' : 'warning'"
                              :icon="importSummary.routeStops.icon"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Route Stops</h4>
                            <p class="text-body-2 text-grey mb-2">{{ importSummary.routeStops.description }}</p>

                            <v-chip
                              :color="importSummary.routeStops.count > 0 ? 'success' : 'warning'"
                              size="small"
                              variant="flat"
                            >
                              {{ importSummary.routeStops.count }} will be imported
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-card class="import-count-card" variant="outlined">
                          <v-card-text class="text-center pa-4">
                            <v-icon
                              class="mb-2"
                              :color="(importSummary as any).drivers?.count > 0 ? 'success' : 'warning'"
                              :icon="(importSummary as any).drivers?.icon || 'mdi-account-hard-hat'"
                              size="32"
                            />
                            <h4 class="text-h6 mb-1">Drivers</h4>
                            <p class="text-body-2 text-grey mb-2">{{ (importSummary as any).drivers?.description || 'Driver information and licenses' }}</p>

                            <v-chip
                              :color="(importSummary as any).drivers?.count > 0 ? 'success' : 'warning'"
                              size="small"
                              variant="flat"
                            >
                              {{ (importSummary as any).drivers?.count || 0 }} will be imported
                            </v-chip>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </template>
                  </v-row>

                  <v-alert
                    v-if="(importSummary.warnings || []).length > 0"
                    class="mt-4"
                    type="warning"
                  >
                    <v-expansion-panels variant="accordion">
                      <v-expansion-panel>
                        <v-expansion-panel-title>
                          <v-icon class="mr-2" icon="mdi-alert" />
                          {{ (importSummary.warnings || []).length }} Warning(s)
                          <v-spacer />
                          <v-btn
                            class="ml-2"
                            prepend-icon="mdi-content-copy"
                            size="small"
                            variant="outlined"
                            @click.stop="copyWarningsToClipboard"
                          >
                            Copy Warnings
                          </v-btn>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-list density="compact">
                            <v-list-item
                              v-for="(warning, index) in (importSummary.warnings || [])"
                              :key="index"
                              :title="warning"
                            >
                              <template #prepend>
                                <v-icon color="warning" icon="mdi-alert-circle" />
                              </template>
                            </v-list-item>
                          </v-list>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-alert>
                </v-card-text>
              </v-card>
            </template>

            <!-- Step 3: Import Progress -->
            <template #item.3>
              <v-card flat>
                <v-card-text>
                  <h3 class="text-h6 mb-4">Import Progress</h3>

                  <v-progress-linear
                    v-model="importProgress"
                    class="mb-4"
                    :color="importComplete ? 'success' : 'primary'"
                    height="8"
                  />

                  <div class="text-center mb-4">
                    <p class="text-body-1">
                      {{ importStatusText }}
                    </p>
                    <p class="text-caption text-grey">
                      {{ importProgress }}% complete
                    </p>
                    <v-alert v-if="importProgress > 0 && importProgress < 100" class="mt-2" type="info" variant="tonal">
                      <div class="text-body-2">
                        <v-icon class="mr-1" icon="mdi-information" size="small" />
                        Large files may take several minutes to process. The system is working...
                      </div>
                    </v-alert>
                  </div>

                  <v-alert
                    v-if="importErrors.length > 0"
                    class="mb-4"
                    type="warning"
                  >
                    <v-expansion-panels variant="accordion">
                      <v-expansion-panel>
                        <v-expansion-panel-title>
                          <v-icon class="mr-2" icon="mdi-alert" />
                          {{ importErrors.length }} Import Warnings
                          <v-spacer />
                          <v-btn
                            class="ml-2"
                            prepend-icon="mdi-content-copy"
                            size="small"
                            variant="outlined"
                            @click.stop="copyImportErrorsToClipboard"
                          >
                            Copy Warnings
                          </v-btn>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-list density="compact">
                            <v-list-item
                              v-for="(error, index) in importErrors"
                              :key="index"
                              :subtitle="`Row ${error.row}: ${error.data}`"
                              :title="error.message"
                            >
                              <template #prepend>
                                <v-icon color="warning" icon="mdi-alert-circle" />
                              </template>
                            </v-list-item>
                          </v-list>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-alert>

                  <v-alert
                    v-if="importComplete && importErrors.length === 0"
                    type="success"
                  >
                    <v-icon class="mr-2" icon="mdi-check-circle" />
                    Import completed successfully!
                  </v-alert>
                </v-card-text>
              </v-card>
            </template>
          </v-stepper>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="importStep > 1 && !importing"
            variant="text"
            @click="importStep--"
          >
            Previous
          </v-btn>
          <v-btn
            v-if="importStep < 3"
            color="primary"
            :disabled="!canProceed"
            :loading="processing"
            @click="nextStep"
          >
            {{ importStep === 1 ? 'Preview Data' : 'Start Import' }}
          </v-btn>
          <v-btn
            v-if="importComplete"
            color="success"
            @click="closeDispatchRoutingDialog"
          >
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showClearDialog"
      max-width="500"
      persistent
    >
      <v-card>
        <v-card-title class="text-h5 red white--text">
          <v-icon class="mr-2" icon="mdi-database-remove" />
          Clear All Databases
        </v-card-title>

        <v-card-text class="pt-4">
          <v-alert
            class="mb-4"
            color="error"
            icon="mdi-alert"
            variant="tonal"
          >
            <strong>Warning:</strong> This action will permanently delete all dispatch data including terminals, customers, and route stops. User accounts will be preserved.
          </v-alert>

          <p class="mb-4">
            To confirm this action, please type <strong>"Clear All Data"</strong> in the field below:
          </p>

          <v-text-field
            v-model="confirmationText"
            density="comfortable"
            hide-details
            label="Confirmation text"
            outlined
            placeholder="Clear All Data"
            variant="outlined"
          />

          <!-- Debug info to help with validation -->
          <div class="mt-2 text-caption text-grey">
            Current input: "{{ confirmationText }}" ({{ confirmationText.length }} characters)
            <br>
            Expected: "Clear All Data" ({{ 'Clear All Data'.length }} characters)
            <br>
            Match: {{ confirmationText === 'Clear All Data' ? 'Yes' : 'No' }}
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="cancelClearDatabase"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :disabled="confirmationText !== 'Clear All Data' || isClearing"
            :loading="isClearing"
            variant="flat"
            @click="confirmClearDatabase"
          >
            Clear Databases
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data

  // Clear database dialog
  const showClearDialog = ref(false)
  const confirmationText = ref('')
  const isClearing = ref(false)

  const dispatchRoutingDialog = ref(false)
  const currentImportType = ref('lanter-endpoints')
  const importStep = ref(1)
  const selectedFile = ref<File[]>([])
  const selectedFileData = ref<File | null>(null)
  const selectedFileName = ref('')
  const fileError = ref('')
  const processing = ref(false)
  const importing = ref(false)
  const importProgress = ref(0)
  const importComplete = ref(false)
  const importStatusText = ref('')
  const importErrors = ref<Array<{ row: number, message: string, data: string }>>([])
  const previewData = ref<any[]>([])
  const importSummary = ref({
    totalRows: 0,
    terminals: {
      count: 0,
      icon: 'mdi-office-building',
      description: 'Terminal locations',
    },
    customers: {
      count: 0,
      icon: 'mdi-account-group',
      description: 'Customer destinations',
    },
    routes: {
      count: 0,
      icon: 'mdi-map-marker-path',
      description: 'Route definitions',
    },
    routeStops: {
      count: 0,
      icon: 'mdi-map-marker-check',
      description: 'Individual route stops',
    },
    warnings: [],
  })

  // Import steps configuration
  const importSteps = [
    { title: 'Upload File', value: 1 },
    { title: 'Preview Data', value: 2 },
    { title: 'Import Progress', value: 3 },
  ]

  // Preview table headers for dispatch routing
  const previewHeaders = [
    { title: 'Terminal', key: 'terminalName' },
    { title: 'Route #', key: 'routeNumber' },
    { title: 'Dealer Name', key: 'dealerName' },
    { title: 'CID', key: 'cid' },
    { title: 'City', key: 'city' },
    { title: 'State', key: 'state' },
    { title: 'ETA', key: 'eta' },
    { title: 'ETD', key: 'etd' },
  ]

  // File validation rules
  const fileRules = computed(() => [
    (files: File[] | File | null | undefined) => {
      if (!files) return 'File is required'

      // Handle both single file and file array
      const fileArray = Array.isArray(files) ? files : [files]
      if (fileArray.length === 0) return 'File is required'

      const file = fileArray[0]
      if (!file || !file.name) return 'Invalid file'

      // Check file type based on import type
      if (currentImportType.value === 'lanter-endpoints' || currentImportType.value === 'driver-board') {
        if (!/\.(xlsx|xls)$/.test(file.name)) return 'File must be Excel format (.xlsx or .xls)'
      } else {
        if (!/\.(xlsx|xls)$/.test(file.name)) return 'File must be Excel format (.xlsx or .xls)'
      }

      if (file.size > 10 * 1024 * 1024) return 'File must be less than 10MB'
      return true
    },
  ])

  // Import tools configuration
  const importTools = computed(() => [
    {
      title: 'Import Endpoints',
      description: 'Import Lanter routing data with terminals, customers, routes, and stops from Excel spreadsheet',
      icon: 'mdi-map-marker-multiple',
      color: 'deep-purple',
      status: 'Ready',
      disabled: false,
      action: () => openDispatchRoutingImport(),
    },
    {
      title: 'Import Driver Board',
      description: 'Import driver board assignments to update routes with truck numbers, drivers, fuel cards, and scanners. Creates equipment database entries.',
      icon: 'mdi-truck-fast',
      color: 'blue',
      status: 'Ready',
      disabled: false,
      action: () => openDriverBoardImport(),
    },
    {
      title: 'Export Endpoints',
      description: 'Export all endpoint data to Excel file with original column format for comparison and backup',
      icon: 'mdi-database-export',
      color: 'green',
      status: 'Ready',
      disabled: false,
      action: () => exportEndpoints(),
    },
    {
      title: 'Clear All Data',
      description: 'Remove all imported data including terminals, customers, routes, and route stops. User accounts are preserved.',
      icon: 'mdi-database-remove',
      color: 'red',
      status: 'Danger Zone',
      disabled: false,
      action: () => openClearDialog(),
    },
  ])

  // Computed properties
  const canProceed = computed(() => {
    if (importStep.value === 1) {
      const files = selectedFile.value
      const hasFile = Array.isArray(files) ? files.length > 0 : !!files
      return hasFile && !fileError.value
    }
    if (importStep.value === 2) {
      if (currentImportType.value === 'driver-board') {
        return (importSummary.value as any).routeAssignments?.count > 0 || false
      }
      return importSummary.value.totalRows > 0
    }
    return false
  })

  // Methods

  const openDispatchRoutingImport = () => {
    currentImportType.value = 'lanter-endpoints'
    dispatchRoutingDialog.value = true
    resetImportState()
  }

  const openDriverBoardImport = () => {
    currentImportType.value = 'driver-board'
    dispatchRoutingDialog.value = true
    resetImportState()
  }

  const closeDispatchRoutingDialog = () => {
    dispatchRoutingDialog.value = false
    resetImportState()
  }

  const resetImportState = () => {
    importStep.value = 1
    selectedFile.value = []
    selectedFileData.value = null
    selectedFileName.value = ''
    fileError.value = ''
    processing.value = false
    importing.value = false
    importProgress.value = 0
    importComplete.value = false
    importStatusText.value = ''
    importErrors.value = []
    previewData.value = []
    importSummary.value = currentImportType.value === 'driver-board'
      ? {
        totalRows: 0,
        routeAssignments: {
          count: 0,
          icon: 'mdi-truck-fast',
          description: 'Route assignments with truck and driver info',
        },
        equipment: {
          count: 0,
          icon: 'mdi-truck',
          description: 'Equipment entries (trucks and sub-units)',
        },
        unmatchedItems: {
          count: 0,
          icon: 'mdi-alert-circle',
          description: 'Routes or drivers that could not be matched',
          items: [],
        },
        warnings: [],
      } as any
      : {
        totalRows: 0,
        terminals: {
          count: 0,
          icon: 'mdi-office-building',
          description: 'Terminal locations',
        },
        customers: {
          count: 0,
          icon: 'mdi-account-group',
          description: 'Customer destinations',
        },
        routes: {
          count: 0,
          icon: 'mdi-map-marker-path',
          description: 'Route definitions',
        },
        routeStops: {
          count: 0,
          icon: 'mdi-map-marker-check',
          description: 'Individual route stops',
        },
        warnings: [],
      }
  }

  const nextStep = async () => {
    console.log('nextStep called, current step:', importStep.value)
    if (importStep.value === 1) {
      console.log('Calling previewFileData...')
      await previewFileData()
    } else if (importStep.value === 2) {
      console.log('Calling startImport...')
      await startImport()
    }
  }

  const previewFileData = async () => {
    console.log('previewFileData called')
    processing.value = true
    fileError.value = ''

    try {
      console.log('Selected file:', selectedFile.value)
      // Handle both array and single file formats
      const files = selectedFile.value
      const file = Array.isArray(files) ? files[0] : files

      if (!file) {
        throw new Error('No file selected')
      }

      console.log('File details:', { name: file.name, size: file.size, type: file.type })

      console.log('Using multipart file upload approach...')

      // Create FormData for multipart upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('importType', currentImportType.value)

      console.log('Calling import-preview service with FormData:', {
        fileName: file.name,
        importType: currentImportType.value,
        fileSize: file.size,
      })

      // Check FeathersJS client status
      console.log('FeathersJS client info:', {
        authenticated: feathersClient.get('authentication'),
        services: Object.keys(feathersClient.services || {}),
        connectionReady: feathersClient.get('connection')?.connected,
      })

      // Check connection status in more detail
      const connection = feathersClient.get('connection')
      console.log('Connection details:', {
        connected: connection?.connected,
        connecting: connection?.connecting,
        disconnected: connection?.disconnected,
        readyState: connection?.readyState,
      })

      // Check raw socket status
      const socket = connection?.io
      console.log('Raw socket details:', {
        connected: socket?.connected,
        disconnected: socket?.disconnected,
        readyState: socket?.readyState,
        id: socket?.id,
      })

      // Skip socket connection check for HTTP file uploads
      console.log('Using HTTP upload - skipping socket connection check')

      // Check if import-preview service exists
      console.log('import-preview service available:', !!feathersClient.service('import-preview'))
      console.log('Available services:', Object.keys(feathersClient.services || {}))

      // Try to access the service directly
      try {
        const importService = feathersClient.service('import-preview')
        console.log('Import service object:', importService)
      } catch (error) {
        console.error('Error accessing import-preview service:', error)
      }

      // Add timeout wrapper - increased to 5 minutes for large files
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 5 minutes - file may be too large or complex')), 300_000),
      )

      // Use HTTP POST for file upload instead of WebSocket
      const backendUrl = `http://${window.location.hostname}:3031`
      console.log('Using HTTP upload to:', `${backendUrl}/import-preview-upload`)

      // Get authentication token
      const auth = await feathersClient.get('authentication')
      const token = auth?.accessToken
      console.log('Using auth token:', token ? 'Token present' : 'No token')

      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      console.log('Making HTTP request to backend...')
      const serviceCall = fetch(`${backendUrl}/import-preview-upload`, {
        method: 'POST',
        body: formData,
        headers,
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response.json()
        })
        .catch(error => {
          console.error('Service call error:', error)
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            response: error.response,
            request: error.request,
          })
          throw error
        })

      // Test basic connectivity first
      try {
        console.log('Testing basic connectivity...')
        const testResult = await feathersClient.service('users').find({ query: { $limit: 1 } })
        console.log('Basic connectivity test successful:', testResult)
      } catch (testError) {
        console.error('Basic connectivity test failed:', testError)
      }

      // Test if import-preview service responds to any method
      try {
        console.log('Testing import-preview service accessibility...')
        const importService = feathersClient.service('import-preview')
        console.log('Import service methods:', Object.getOwnPropertyNames(importService))
        console.log('Import service prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(importService)))
      } catch (serviceTestError) {
        console.error('Import service test failed:', serviceTestError)
      }

      console.log('Waiting for service response...')
      const result = await Promise.race([serviceCall, timeoutPromise])
      console.log('Import preview result:', result)

      if (!result.success) {
        throw new Error(result.warnings?.[0] || 'Failed to preview file data')
      }

      // Use import summary from backend if available
      if (result.importSummary) {
        importSummary.value = result.importSummary

        // Validate we have at least some data to import
        let totalItems = 0
        totalItems = currentImportType.value === 'driver-board'
          ? ((importSummary.value as any).routeAssignments?.count || 0) + 
            ((importSummary.value as any).benchDrivers?.count || 0) +
            ((importSummary.value as any).leaders?.count || 0)
          : importSummary.value.terminals.count
            + importSummary.value.customers.count
            + importSummary.value.routes.count
            + importSummary.value.routeStops.count
        if (totalItems === 0) {
          throw new Error('No valid data found in the Excel file')
        }
      } else {
        // Fallback for older import types
        previewData.value = result.data || []
        if (previewData.value.length === 0) {
          fileError.value = 'No valid data found in the file'
          return
        }
      }

      // Store the file object for later use in import
      selectedFileData.value = file
      selectedFileName.value = file.name
      importStep.value = 2
    } catch (error: any) {
      fileError.value = error.message || 'Failed to process file'
      console.error('Preview error:', error)
    } finally {
      processing.value = false
    }
  }

  const startImport = async () => {
    importing.value = true
    importProgress.value = 0
    importStatusText.value = 'Starting import...'
    importStep.value = 3

    try {
      if (!selectedFileData.value) {
        throw new Error('No file uploaded')
      }

      // Detailed progress updates for each database save
      const progressSteps = [
        { progress: 10, text: 'Reading and parsing Excel sheets...' },
        { progress: 25, text: 'Processing Routes sheet data...' },
        { progress: 35, text: 'Processing Terminals sheet data...' },
        { progress: 45, text: 'Saving terminals to database...' },
        { progress: 60, text: 'Saving customers to database...' },
        { progress: 75, text: 'Saving routes to database...' },
        { progress: 90, text: 'Saving route stops to database...' },
        { progress: 95, text: 'Finalizing import...' },
      ]

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 200))
        importProgress.value = step.progress
        importStatusText.value = step.text
      }

      // Start the import process using HTTP multipart upload
      const backendUrl = `http://${window.location.hostname}:3031`
      const importFormData = new FormData()
      importFormData.append('file', selectedFileData.value)
      importFormData.append('fileName', selectedFileName.value)
      importFormData.append('importType', currentImportType.value)

      const auth = await feathersClient.get('authentication')
      const token = auth?.accessToken
      const importHeaders: Record<string, string> = {}
      if (token) {
        importHeaders['Authorization'] = `Bearer ${token}`
      }

      const importResponse = await fetch(`${backendUrl}/import-process-upload`, {
        method: 'POST',
        body: importFormData,
        headers: importHeaders,
      })

      if (!importResponse.ok) {
        throw new Error(`Import failed: ${importResponse.status} ${importResponse.statusText}`)
      }

      const result = await importResponse.json()

      importProgress.value = 100
      importStatusText.value = result.message || 'Import completed successfully!'
      importErrors.value = result.warnings || []
      importComplete.value = true
    } catch (error: any) {
      importStatusText.value = 'Import failed: ' + (error.message || 'Unknown error')
      importErrors.value.push({
        row: 0,
        message: error.message || 'Import process failed',
        data: 'System error',
      })
    } finally {
      importing.value = false
    }
  }

  // Copy warnings to clipboard
  const copyWarningsToClipboard = async () => {
    const warnings = (importSummary.value.warnings || []) as string[]
    const warningsText = warnings.join('\n')
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(warningsText)
        console.log('Preview warnings copied to clipboard')
      } else {
        throw new Error('Clipboard API not available')
      }
    } catch {
      console.log('Using fallback copy method')
      // Fallback method
      const textArea = document.createElement('textarea')
      textArea.value = warningsText
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.append(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      console.log('Preview warnings copied to clipboard (fallback)')
    }
  }

  // Copy import errors to clipboard
  const copyImportErrorsToClipboard = async () => {
    const errorsText = importErrors.value.map(error =>
      `Row ${error.row}: ${error.message} - ${error.data}`,
    ).join('\n')
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(errorsText)
        console.log('Import warnings copied to clipboard')
      } else {
        throw new Error('Clipboard API not available')
      }
    } catch {
      console.log('Using fallback copy method for import errors')
      // Fallback method
      const textArea = document.createElement('textarea')
      textArea.value = errorsText
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.append(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      console.log('Import warnings copied to clipboard (fallback)')
    }
  }

  // Clear database methods
  const openClearDialog = () => {
    showClearDialog.value = true
    confirmationText.value = ''
  }

  const cancelClearDatabase = () => {
    showClearDialog.value = false
    confirmationText.value = ''
    isClearing.value = false
  }

  const confirmClearDatabase = async () => {
    if (confirmationText.value !== 'Clear All Data') {
      return
    }

    isClearing.value = true

    try {
      // Call backend endpoint to clear databases
      console.log('Sending to backend:', { action: 'clear-databases' })
      const result = await feathersClient.service('admin').create({
        action: 'clear-databases',
      })
      console.log('Backend response:', result)

      // Show success message
      alert('All databases have been cleared successfully!')

      // Refresh the page or redirect
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to clear databases:', error)
      alert(`Failed to clear databases: ${error.message || 'Unknown error'}`)
    } finally {
      isClearing.value = false
      showClearDialog.value = false
      confirmationText.value = ''
    }
  }

  // Export endpoints method
  const exportEndpoints = async () => {
    try {
      console.log('Starting endpoint export...')

      // Call the backend admin service to generate the Excel file
      const result = await feathersClient.service('admin').create({
        action: 'export-endpoints',
      })

      if (!result.success) {
        throw new Error(result.message || 'Export failed')
      }

      console.log('Export result:', result)

      // Convert base64 data to blob and trigger download
      const base64Data = result.data.data
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Uint8Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.codePointAt(i) || 0
      }
      const byteArray = byteNumbers
      const blob = new Blob([byteArray], {
        type: result.data.mimeType,
      })

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.data.filename
      document.body.append(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Show success message
      alert(`Successfully exported ${result.data.recordCount} endpoint records to ${result.data.filename}`)
    } catch (error: any) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message || 'Unknown error'}`)
    }
  }

  // Check admin permissions
  onMounted(() => {
    if (!authStore.isAdmin()) {
      router.push('/admin')
    }
  })
</script>

<style scoped>
.import-tool-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.import-tool-card:hover:not(.tool-disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.tool-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tool-disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

.v-stepper {
  box-shadow: none;
}

.import-count-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.import-count-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
