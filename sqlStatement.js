function getProductionRecordsForFarmer(farmer_id) {
  return `SELECT 
    Animal.animal_tag,
    Animal.name as animal_name,
    MilkProduction.production_date,
    SUM(MilkProduction.quantity) as total_daily_production,
    COUNT(*) as milking_sessions,
    Farmers.farm_name,
    MilkProduction.unit
FROM MilkProduction 
JOIN Animal ON MilkProduction.animal_id = Animal.animal_tag
JOIN Farmers ON Animal.owner_id = Farmers.farmer_id
WHERE Farmers.farmer_id = ${farmer_id}
GROUP BY Animal.animal_tag, Animal.name, MilkProduction.production_date, Farmers.farm_name, MilkProduction.unit
ORDER BY MilkProduction.production_date DESC, total_daily_production DESC;`;
}



module.exports = { getProductionRecordsForFarmer };
