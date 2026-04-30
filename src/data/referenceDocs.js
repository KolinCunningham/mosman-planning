export const DOC_CATEGORIES = {
  SD_CIVIL: { label: 'Standard Drawings — Civil', color: 'bg-orange-600', desc: 'Council standard construction drawings for roads, paths, drainage' },
  SD_DRAINAGE: { label: 'Standard Drawings — Drainage', color: 'bg-blue-600', desc: 'Drainage pit, pipe, and stormwater standard details' },
  DCP: { label: 'Development Control Plans', color: 'bg-purple-600', desc: 'DCP chapters governing development standards' },
  LEP_AMEND: { label: 'LEP Amendments', color: 'bg-red-600', desc: 'Formal amendments to Mosman LEP 2012' },
  POM: { label: 'Plans of Management', color: 'bg-green-600', desc: 'Adopted management plans for public land and reserves' },
  POLICY: { label: 'Policies', color: 'bg-teal-600', desc: 'Council-adopted policies relevant to development and environment' },
  STRATEGY: { label: 'Strategies & Master Plans', color: 'bg-pink-600', desc: 'Long-term strategies and master plans' },
  CONTRIBUTIONS: { label: 'Contributions & Agreements', color: 'bg-yellow-600', desc: 'Development contributions plans, registers, and planning agreements' },
  GUIDELINES: { label: 'Guidelines & Manuals', color: 'bg-indigo-600', desc: 'Technical guidelines, manuals, and lodgement guides' },
}

export const REFERENCE_DOCS = [
  // Standard Drawings — Civil
  { id: 'sd101a', category: 'SD_CIVIL', code: 'SD101a', title: 'Kerbs and Gutters', file: 'ecm_3287447_v1_sd101a_kerbs_and_gutters_rev_c.pdf', rev: 'Rev C', relevance: 'Street edge treatment for new developments and road works' },
  { id: 'sd101b', category: 'SD_CIVIL', code: 'SD101b', title: 'Kerbs and Gutters (Alt)', file: 'ecm_3287448_v1_sd101b_kerbs_and_gutters_rev_c.pdf', rev: 'Rev C', relevance: 'Alternative kerb profiles for varied street contexts' },
  { id: 'sd102', category: 'SD_CIVIL', code: 'SD102', title: 'Vehicular Crossing and Layback', file: 'ecm_3287449_v1_sd102_vehicular_crossing_and_layback_rev_c.pdf', rev: 'Rev C', relevance: 'Driveway crossings — critical for basement car park entries in medium/high density' },
  { id: 'sd103', category: 'SD_CIVIL', code: 'SD103', title: 'Gutter Bridge', file: 'ecm_3287450_v1_sd103_gutter_bridge_rev_c.pdf', rev: 'Rev C', relevance: 'Temporary gutter crossing during construction' },
  { id: 'sd104', category: 'SD_CIVIL', code: 'SD104', title: 'Footpath Standard Details', file: 'ecm_3324393_v1_sd104_footpath_standard_details_rev_c.pdf', rev: 'Rev C', relevance: 'Standard footpath construction — applies to all new development frontages' },
  { id: 'sd105', category: 'SD_CIVIL', code: 'SD105', title: 'Brick Paved Footpath', file: 'ecm_3287452_v1_sd105_brick_paved_footpath_rev_c.pdf', rev: 'Rev C', relevance: 'Heritage-compatible paving for village centre streetscapes' },
  { id: 'sd106', category: 'SD_CIVIL', code: 'SD106', title: 'Pedestrian Ramps', file: 'ecm_3287453_v1_sd106_pedestrian_ramps_rev_c.pdf', rev: 'Rev C', relevance: 'Accessibility ramps — mandatory at all new kerb crossings' },
  { id: 'sd107a', category: 'SD_CIVIL', code: 'SD107a', title: 'Shared Paths', file: 'ecm_3287454_v1_sd107a_share_paths_rev_b.pdf', rev: 'Rev B', relevance: 'Shared pedestrian/cycle path construction — relevant to active transport suggestions' },
  { id: 'sd107b', category: 'SD_CIVIL', code: 'SD107b', title: 'Shared Paths (Alt)', file: 'ecm_3287455_v1_sd107b_share_paths_rev_b.pdf', rev: 'Rev B', relevance: 'Alternative shared path cross-sections' },
  { id: 'sd108', category: 'SD_CIVIL', code: 'SD108', title: 'Driveway Linemarking', file: 'ecm_3287454_v1_sd108_driveway_linemarking_rev_c.pdf', rev: 'Rev C', relevance: 'Linemarking requirements at driveway crossings' },
  { id: 'sd213', category: 'SD_CIVIL', code: 'SD213', title: 'Stair On-Grade', file: 'sd213_-_stair_on-grade_rev_a.pdf', rev: 'Rev A', relevance: 'Grade change stairs — relevant for steep sites and public domain connections' },

  // Standard Drawings — Drainage
  { id: 'sd201', category: 'SD_DRAINAGE', code: 'SD201', title: 'Drainage Pit Notes', file: 'ecm_3287456_v1_sd201_drainage_pit_notes_rev_d.pdf', rev: 'Rev D', relevance: 'General notes for all drainage pit installations' },
  { id: 'sd202', category: 'SD_DRAINAGE', code: 'SD202', title: 'On-Grade Kerb Inlet Pit', file: 'ecm_3287457_v1_sd202_on_grade_kerb_inlet_pit_rev_d.pdf', rev: 'Rev D', relevance: 'Stormwater capture at kerb — critical in high-density areas' },
  { id: 'sd203', category: 'SD_DRAINAGE', code: 'SD203', title: 'Sag Pit', file: 'ecm_3287458_v1_sd203_sag_pit_rev_c.pdf', rev: 'Rev C', relevance: 'Low-point drainage pit construction' },
  { id: 'sd204', category: 'SD_DRAINAGE', code: 'SD204', title: 'Surface Inlet Pit', file: 'ecm_3287459_v1_sd204_surface_inlet_pit_rev_c.pdf', rev: 'Rev C', relevance: 'Surface water collection in open areas' },
  { id: 'sd205', category: 'SD_DRAINAGE', code: 'SD205', title: 'Junction Pit', file: 'ecm_3287460_v1_sd205_junction_pit_rev_c.pdf', rev: 'Rev C', relevance: 'Drainage network junction construction' },
  { id: 'sd206', category: 'SD_DRAINAGE', code: 'SD206', title: 'Surcharge and Letterbox Pits', file: 'ecm_3287441_v1_sd206_surcharge_and_letterbox_pits_rev_c.pdf', rev: 'Rev C', relevance: 'Overflow management and inspection access' },
  { id: 'sd207', category: 'SD_DRAINAGE', code: 'SD207', title: 'Subsoil Drainage', file: 'ecm_3620658_v1_sd207_subsoil_draininage_rev_c.pdf', rev: 'Rev C', relevance: 'Subsoil drain design — essential for basement waterproofing in higher density' },
  { id: 'sd208', category: 'SD_DRAINAGE', code: 'SD208', title: 'Foundation Near Easements', file: 'ecm_3287443_v1_sd208_foundation_near_easements_rev_c.pdf', rev: 'Rev C', relevance: 'Foundation setbacks from drainage easements — affects site coverage on constrained lots' },
  { id: 'sd209', category: 'SD_DRAINAGE', code: 'SD209', title: 'Concrete Bulkhead and Pipe Anchor', file: 'ecm_3287444_v1_sd209_concrete_bulk_head_and_pipe_anchor_rev_d.pdf', rev: 'Rev D', relevance: 'Pipe restraint at grade changes' },
  { id: 'sd210', category: 'SD_DRAINAGE', code: 'SD210', title: 'Concrete Headwall — Single Pipe', file: 'ecm_3287445_v1_sd210_concrete_headwall_-_single_pipe_rev_b.pdf', rev: 'Rev B', relevance: 'Outfall headwall at waterways and foreshores' },
  { id: 'sd211', category: 'SD_DRAINAGE', code: 'SD211', title: 'Concrete Headwall — Multiple Pipes', file: 'ecm_3287446_v1_sd211_concrete_headwall_multiple_pipes_rev_b.pdf', rev: 'Rev B', relevance: 'Multi-pipe outfall at waterways' },
  { id: 'sd212a', category: 'SD_DRAINAGE', code: 'SD212a', title: 'Stormwater Pipe', file: 'ecm_3364741_v1_sd212a_rev_b.pdf', rev: 'Rev B', relevance: 'Standard stormwater pipe installation' },
  { id: 'sd212b', category: 'SD_DRAINAGE', code: 'SD212b', title: 'Stormwater Pipe 150mm', file: 'ecm_3325247_v1_sd212b_stormwater_pipe_150mm_rev_b.pdf', rev: 'Rev B', relevance: 'Small-diameter pipe details for lot drainage' },

  // DCPs
  { id: 'dcp-residential', category: 'DCP', code: 'DCP', title: 'Residential Development Control Plan', file: 'Mosman_Residential_Development_Control_Plan.pdf', relevance: 'Primary DCP governing all residential development — setbacks, heights, landscaping, parking, heritage, BASIX' },
  { id: 'dcp-business', category: 'DCP', code: 'DCP', title: 'Business Centres Development Control Plan', file: 'Mosman_Business_Centres_Development_Control_Plan.pdf', relevance: 'Controls for Military Rd, Spit Junction, and local centres — key for masterplan growth spine' },
  { id: 'dcp-openspace', category: 'DCP', code: 'DCP', title: 'Open Space and Infrastructure DCP', file: 'Mosman_Open_Space_and_Infrastructure_Development_Control_Plan.pdf', relevance: 'Open space requirements, streetworks, public domain works triggered by development' },
  { id: 'dcp-waste', category: 'DCP', code: 'DCP', title: 'Waste Not DCP', file: 'Waste%20Not%20DCP%20MOSMAN.pdf', relevance: 'Waste and recycling requirements for new developments — storage, access, bin rooms' },

  // LEP Amendments
  { id: 'lep-amend-11', category: 'LEP_AMEND', code: 'LEP AMD 11', title: 'MLEP 2012 Amendment No 11', file: 'MLEP%202012%20Amend%20No%2011%20-%20LW%2027%20May%202022.pdf', date: '27 May 2022', relevance: 'Gazetted amendment — check for zoning and map changes affecting current baseline' },
  { id: 'lep-amend-12', category: 'LEP_AMEND', code: 'LEP AMD 12', title: 'MLEP 2012 Amendment No 12', file: 'MLEP%202012%20Amendment%20No%2012%20-%209%20Sept%202022.pdf', date: '9 Sep 2022', relevance: 'Most recent gazetted amendment — current baseline controls' },

  // Plans of Management
  { id: 'pom-balmoral', category: 'POM', code: 'POM', title: 'Balmoral Plan of Management', file: 'Balmoral%20Plan%20of%20Management%20(updated%202016).pdf', date: '2016', relevance: 'Controls Balmoral Beach reserve area — affects foreshore suggestions' },
  { id: 'pom-clifton', category: 'POM', code: 'POM', title: 'Clifton Gardens Reserve Plan of Management', file: 'Clifton%20Gardens%20Reserve%20Plan%20of%20Management_As%20Adopted%204NOV25_compressed.pdf', date: 'Nov 2025', relevance: 'Recently adopted — controls Clifton Gardens foreshore reserve' },
  { id: 'pom-mosmanpark', category: 'POM', code: 'POM', title: 'Mosman Park Plan of Management', file: '250203.Mosman.Park_.POM_.As_.Adopted.pdf', date: 'Feb 2025', relevance: 'Controls Mosman Park — adjacent to civic precinct and Village Green expansion' },
  { id: 'pom-mosmanbaycove', category: 'POM', code: 'POM', title: 'Mosman Bay and Sirius Cove Plan of Management', file: 'Mosman%20Bay%20Sirius%20Cove%20Plan%20of%20Management%20Final%2014%20Feb%202022.pdf', date: 'Feb 2022', relevance: 'Controls harbour foreshore reserves — scenic protection area interactions' },
  { id: 'pom-rosherville', category: 'POM', code: 'POM', title: 'Rosherville Reserve and Chinamans Beach POM', file: 'Rosherville%20Reserve%20and%20Chinamans%20Beach%20Plan%20of%20Management_As%20Adopted%204NOV25.pdf', date: 'Nov 2025', relevance: 'Northern foreshore — open space network planning' },
  { id: 'pom-spit', category: 'POM', code: 'POM', title: 'The Spit Reserves Plan of Management', file: 'The_Spit_Reserves_Plan_of_Management.pdf', relevance: 'Spit Junction gateway area reserves — relevant to masterplan gateway strategy' },
  { id: 'pom-bushland', category: 'POM', code: 'POM', title: 'Bushland Plan of Management', file: 'Plan%20of%20Management%20Bushland%202012%20-%20Final.pdf', date: '2012', relevance: 'Governs C4 Environmental Living zone bushland — scenic protection interactions' },
  { id: 'pom-parks', category: 'POM', code: 'POM', title: 'Parks Plan of Management', file: 'Plan%20of%20Management%20Parks%202012%20-%20Final.pdf', date: '2012', relevance: 'General parks management — applies to all unclassified community land' },
  { id: 'pom-rawson', category: 'POM', code: 'POM', title: 'Rawson Park Plan of Management', file: 'pom-rawson.pdf', relevance: 'Rawson Park controls' },
  { id: 'pom-bathers', category: 'POM', code: 'POM', title: 'Bathers Pavillion Plan of Management', file: 'pom-batherspavillion.pdf', relevance: 'Balmoral foreshore commercial facility' },

  // Policies
  { id: 'pol-stormwater', category: 'POLICY', code: 'POLICY', title: 'Stormwater Management Policy', file: 'ADOPTED%20POLICY%20Stormwater%20Management%20within%20Mosman%20with%20changes%20adopted%20on%203DEC2024.pdf', date: 'Dec 2024', relevance: 'Stormwater on-site detention and quality requirements — affects all new development and density uplift' },
  { id: 'pol-environment', category: 'POLICY', code: 'POLICY', title: 'Environmental Sustainability Policy', file: 'Environmental-Sustainability-Policy_0.pdf', relevance: 'Council sustainability commitments — relevant to energy, water, and green infrastructure suggestions' },
  { id: 'pol-greywater', category: 'POLICY', code: 'POLICY', title: 'Grey Water Policy for Domestic Use', file: 'Grey%20Water%20Policy%20For%20Domestic%20Use.pdf', relevance: 'Greywater reuse in residential development — water conservation suggestions' },
  { id: 'pol-urbanforest', category: 'POLICY', code: 'POLICY', title: 'Urban Forest Management Policy', file: 'Urban%20Forest%20Management%20Policy.pdf', relevance: 'Tree canopy targets and management framework — directly relevant to tree protection suggestions' },
  { id: 'pol-planning-agreements', category: 'POLICY', code: 'POLICY', title: 'Planning Agreements Policy', file: 'Mosman%20Planning%20Agreements%20Policy.pdf', relevance: 'VPA framework — key mechanism for capturing developer contributions for community infrastructure' },

  // Strategies
  { id: 'strat-heritage', category: 'STRATEGY', code: 'STRATEGY', title: 'Heritage Strategy', file: 'Mosman%20Heritage%20Strategy%20-%20May%202016.pdf', date: 'May 2016', relevance: 'Strategic framework for heritage conservation — basis for heritage suggestions and DCP changes' },
  { id: 'strat-streettree', category: 'STRATEGY', code: 'STRATEGY', title: 'Street Tree Master Plan', file: 'Street%20Tree%20Master%20Plan%20-%20Adopted%2004%20July%202017.pdf', date: 'Jul 2017', relevance: 'Street-by-street tree species and canopy strategy — directly informs building setback and height transition rules near heritage-listed trees' },

  // Contributions
  { id: 'contrib-plan', category: 'CONTRIBUTIONS', code: 'S7.11', title: 'Mosman Contributions Plan 2022', file: '220111.005.Mosman.Contributions.Plan%202022.01_ADOPTED_LR.pdf', date: '2022', relevance: 'S7.11 contributions framework — levies on development for community infrastructure. Must be reviewed for any density uplift suggestion' },
  { id: 'contrib-register', category: 'CONTRIBUTIONS', code: 'REGISTER', title: 'Development Contributions Register', file: 'Development%20Contributions%20Register.pdf', relevance: 'Tracks contributions collected and planned expenditure — useful for infrastructure gap analysis' },

  // Guidelines & Manuals
  { id: 'guide-publicdomain', category: 'GUIDELINES', code: 'MANUAL', title: 'Public Domain Manual', file: 'ECM_5965487_v4_Final%20-%20Public%20Domain%20Manual%20Mosman%20Council%20-%20Nov2020.pdf', date: 'Nov 2020', relevance: 'Comprehensive manual for public domain design — materials, street furniture, paving, lighting, signage. Essential for all streetscape and open space suggestions' },
  { id: 'guide-lodgement', category: 'GUIDELINES', code: 'GUIDE', title: 'Application Lodgement Guide and Matrix', file: '200158.003.Application.Lodgement.Guide%26Matrix.02.pdf', relevance: 'DA lodgement requirements and document matrix — reference for regulatory pathway sections' },
  { id: 'asset-strategy', category: 'GUIDELINES', code: 'ASSET', title: 'Asset Plan — Strategy and Policy', file: '250106.001.asset_.plan_.strategypolicy.01_adopted.pdf', date: 'Jan 2025', relevance: 'Council infrastructure asset management strategy — links infrastructure needs to population growth' },
  { id: 'asset-roads', category: 'GUIDELINES', code: 'ASSET', title: 'Asset Plan — Roads', file: '250106.006.asset_.plan_.roads_.01_adopted.pdf', date: 'Jan 2025', relevance: 'Road network asset condition and renewal plan — essential for transport and EV charging suggestions' },
]

export const docsByCategory = (category) => REFERENCE_DOCS.filter(d => d.category === category)
